//! The HTTP relay of the DuckDB sandbox host. The module hands over a serialized request (method, timeout, url,
//! headers, body); the relay checks it against the policy, performs it with ureq over rustls, and serves status,
//! headers and body back through a handle. Everything crossing the boundary is bytes the C host copies into
//! and out of the sandbox's linear memory; no pointer of ours is ever visible to the module.
//!
//! Policy: default deny. `relay_allow("[scheme://]host[:port]")` opens one origin (`*.` prefix for a domain's
//! subdomains); https unless the entry says http; redirects are not followed (the module sees the 3xx); a
//! response body is cut at `relay_set_max_response`.
#![forbid(unsafe_op_in_unsafe_fn)]

use std::collections::HashMap;
use std::ffi::CStr;
use std::io::Read;
use std::os::raw::c_char;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use ureq::tls::{RootCerts, TlsConfig, TlsProvider};
use ureq::Agent;

struct Origin {
    scheme: String,
    host: String, // "*.example.com" matches subdomains
    port: u16,
}

struct Handle {
    status: u16,
    headers: String,
    reader: Box<dyn Read + Send>,
    error: Option<String>,
}

struct State {
    agent: Agent,
    allow: Vec<Origin>,
    max_response: u64,
    handles: HashMap<i32, Arc<Mutex<Handle>>>,
    next_handle: i32,
    last_error: String,
}

static STATE: OnceLock<Mutex<State>> = OnceLock::new();

fn state() -> &'static Mutex<State> {
    STATE.get_or_init(|| {
        let tls = TlsConfig::builder()
            .provider(TlsProvider::Rustls)
            .root_certs(RootCerts::PlatformVerifier)
            .build();
        let config = Agent::config_builder()
            .http_status_as_error(false)
            .max_redirects(0)
            .tls_config(tls)
            .build();
        Mutex::new(State {
            agent: config.new_agent(),
            allow: Vec::new(),
            max_response: 1 << 40,
            handles: HashMap::new(),
            next_handle: 1,
            last_error: String::new(),
        })
    })
}

fn default_port(scheme: &str) -> u16 {
    if scheme == "http" {
        80
    } else {
        443
    }
}

fn parse_origin(spec: &str) -> Option<Origin> {
    let (scheme, rest) = match spec.split_once("://") {
        Some((s, r)) => (s.to_ascii_lowercase(), r),
        None => ("https".to_string(), spec),
    };
    if scheme != "http" && scheme != "https" {
        return None;
    }
    let rest = rest.trim_end_matches('/');
    let (host, port) = match rest.rsplit_once(':') {
        Some((h, p)) if p.chars().all(|c| c.is_ascii_digit()) && !p.is_empty() => (h, p.parse().ok()?),
        _ => (rest, default_port(&scheme)),
    };
    if host.is_empty() {
        return None;
    }
    Some(Origin { scheme, host: host.to_ascii_lowercase(), port })
}

fn allowed(state: &State, url: &url::Url) -> bool {
    let scheme = url.scheme();
    let host = match url.host_str() {
        Some(h) => h.to_ascii_lowercase(),
        None => return false,
    };
    let port = url.port().unwrap_or_else(|| default_port(scheme));
    state.allow.iter().any(|o| {
        o.scheme == scheme
            && o.port == port
            && (o.host == host
                || (o.host.starts_with("*.") && host.ends_with(&o.host[1..]) && host.len() > o.host.len() - 1))
    })
}

// ---- the request as the module serializes it (little endian) ----
struct Request {
    method: u8,
    timeout_ms: u32,
    url: String,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

struct Cursor<'a> {
    data: &'a [u8],
    pos: usize,
}

impl<'a> Cursor<'a> {
    fn take(&mut self, n: usize) -> Option<&'a [u8]> {
        let end = self.pos.checked_add(n)?;
        let s = self.data.get(self.pos..end)?;
        self.pos = end;
        Some(s)
    }
    fn u8(&mut self) -> Option<u8> {
        Some(self.take(1)?[0])
    }
    fn u32(&mut self) -> Option<u32> {
        Some(u32::from_le_bytes(self.take(4)?.try_into().ok()?))
    }
    fn u64(&mut self) -> Option<u64> {
        Some(u64::from_le_bytes(self.take(8)?.try_into().ok()?))
    }
    fn string(&mut self) -> Option<String> {
        let n = self.u32()? as usize;
        String::from_utf8(self.take(n)?.to_vec()).ok()
    }
}

fn parse_request(data: &[u8]) -> Option<Request> {
    let mut c = Cursor { data, pos: 0 };
    let method = c.u8()?;
    let timeout_ms = c.u32()?;
    let url = c.string()?;
    let count = c.u32()?;
    if count > 1024 {
        return None;
    }
    let mut headers = Vec::with_capacity(count as usize);
    for _ in 0..count {
        let k = c.string()?;
        let v = c.string()?;
        headers.push((k, v));
    }
    let body_len = c.u64()?;
    if body_len > (1 << 32) {
        return None;
    }
    let body = c.take(body_len as usize)?.to_vec();
    if c.pos != data.len() {
        return None;
    }
    Some(Request { method, timeout_ms, url, headers, body })
}

fn header_ok(k: &str, v: &str) -> bool {
    !k.is_empty()
        && k.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
        && v.bytes().all(|b| b != b'\r' && b != b'\n' && b != 0)
}

fn perform(agent: &Agent, max_response: u64, req: &Request) -> Result<Handle, String> {
    let timeout = Duration::from_millis(if req.timeout_ms == 0 { 30_000 } else { req.timeout_ms as u64 });
    for (k, v) in &req.headers {
        if !header_ok(k, v) {
            return Err(format!("header '{}' rejected", k));
        }
    }
    // build through the http crate so that every method goes the same way
    let method = match req.method {
        0 => "GET",
        1 => "PUT",
        2 => "HEAD",
        3 => "DELETE",
        4 => "POST",
        5 => "OPTIONS",
        _ => return Err("unknown method".to_string()),
    };
    let mut builder = ureq::http::Request::builder().method(method).uri(req.url.as_str());
    for (k, v) in &req.headers {
        builder = builder.header(k.as_str(), v.as_str());
    }
    let request = builder.body(req.body.clone()).map_err(|e| e.to_string())?;
    let request = agent.configure_request(request).timeout_global(Some(timeout)).build();
    let response = agent.run(request).map_err(|e| e.to_string())?;
    let status = response.status().as_u16();
    let mut headers = String::new();
    for (name, value) in response.headers().iter() {
        if let Ok(v) = value.to_str() {
            headers.push_str(name.as_str());
            headers.push_str(": ");
            headers.push_str(v);
            headers.push('\n');
        }
    }
    let reader = response.into_body().into_with_config().limit(max_response).reader();
    Ok(Handle { status, headers, reader: Box::new(reader), error: None })
}

fn copy_out(text: &str, buf: *mut u8, cap: usize) -> i64 {
    let bytes = text.as_bytes();
    if !buf.is_null() && cap > 0 {
        let n = bytes.len().min(cap);
        // SAFETY: the C host hands us a buffer of `cap` bytes inside the sandbox memory it already range-checked
        unsafe { std::ptr::copy_nonoverlapping(bytes.as_ptr(), buf, n) };
    }
    bytes.len() as i64
}

// ---- the C ABI ----

/// Allows one origin: "[scheme://]host[:port]", "*.example.com" for subdomains. Returns 0, or -1 if malformed.
#[no_mangle]
pub extern "C" fn relay_allow(spec: *const c_char) -> i32 {
    if spec.is_null() {
        return -1;
    }
    // SAFETY: a NUL-terminated string from the host's argv
    let spec = unsafe { CStr::from_ptr(spec) }.to_string_lossy();
    match parse_origin(spec.trim()) {
        Some(o) => {
            state().lock().unwrap().allow.push(o);
            0
        }
        None => -1,
    }
}

#[no_mangle]
pub extern "C" fn relay_set_max_response(bytes: u64) {
    state().lock().unwrap().max_response = bytes;
}

/// Performs the serialized request; returns a handle (>= 0) or -1 (relay_error(-1) tells why).
#[no_mangle]
pub extern "C" fn relay_request(data: *const u8, len: usize) -> i32 {
    if data.is_null() {
        return -1;
    }
    // SAFETY: the host range-checked [data, data+len) inside the sandbox memory
    let bytes = unsafe { std::slice::from_raw_parts(data, len) };
    let req = match parse_request(bytes) {
        Some(r) => r,
        None => {
            state().lock().unwrap().last_error = "malformed request".to_string();
            return -1;
        }
    };
    let (agent, max_response) = {
        let st = state().lock().unwrap();
        let url = match url::Url::parse(&req.url) {
            Ok(u) => u,
            Err(e) => {
                drop(st);
                state().lock().unwrap().last_error = format!("bad url: {}", e);
                return -1;
            }
        };
        if !allowed(&st, &url) {
            drop(st);
            state().lock().unwrap().last_error = format!("origin not allowed: {}", req.url);
            return -1;
        }
        (st.agent.clone(), st.max_response)
    };
    // the network happens without the global lock held
    match perform(&agent, max_response, &req) {
        Ok(handle) => {
            let mut st = state().lock().unwrap();
            let id = st.next_handle;
            st.next_handle = st.next_handle.wrapping_add(1).max(1);
            st.handles.insert(id, Arc::new(Mutex::new(handle)));
            id
        }
        Err(e) => {
            state().lock().unwrap().last_error = e;
            -1
        }
    }
}

fn handle(id: i32) -> Option<Arc<Mutex<Handle>>> {
    state().lock().unwrap().handles.get(&id).cloned()
}

#[no_mangle]
pub extern "C" fn relay_status(id: i32) -> i32 {
    match handle(id) {
        Some(h) => h.lock().unwrap().status as i32,
        None => -1,
    }
}

/// "name: value\n" lines; returns the total length, which may exceed `cap` (call again with a bigger buffer).
#[no_mangle]
pub extern "C" fn relay_headers(id: i32, buf: *mut u8, cap: usize) -> i64 {
    match handle(id) {
        Some(h) => copy_out(&h.lock().unwrap().headers, buf, cap),
        None => -1,
    }
}

/// The next body bytes: 0 at the end, -1 on error (relay_error(id)).
#[no_mangle]
pub extern "C" fn relay_read(id: i32, buf: *mut u8, cap: usize) -> i64 {
    let h = match handle(id) {
        Some(h) => h,
        None => return -1,
    };
    if buf.is_null() || cap == 0 {
        return 0;
    }
    // SAFETY: the host range-checked [buf, buf+cap) inside the sandbox memory
    let out = unsafe { std::slice::from_raw_parts_mut(buf, cap) };
    let mut h = h.lock().unwrap();
    loop {
        match h.reader.read(out) {
            Ok(n) => return n as i64,
            Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(e) => {
                h.error = Some(e.to_string());
                return -1;
            }
        }
    }
}

/// The error text of a handle, or of the last failed relay_request when id is -1.
#[no_mangle]
pub extern "C" fn relay_error(id: i32, buf: *mut u8, cap: usize) -> i64 {
    if id < 0 {
        return copy_out(&state().lock().unwrap().last_error, buf, cap);
    }
    match handle(id) {
        Some(h) => copy_out(h.lock().unwrap().error.as_deref().unwrap_or(""), buf, cap),
        None => -1,
    }
}

#[no_mangle]
pub extern "C" fn relay_close(id: i32) {
    state().lock().unwrap().handles.remove(&id);
}
