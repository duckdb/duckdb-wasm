use crate::arrow_printer::pretty_format_batches_fmt;
use crate::duckdb;
use crate::duckdb::AsyncDuckDB;
use crate::prettytable::format::consts::FORMAT_BOX_CHARS;
use crate::prompt_buffer::PromptBuffer;
use crate::shell_runtime::ShellRuntime;
use crate::utils::{now, pretty_elapsed};
use crate::vt100;
use crate::xterm::{OnKeyEvent, Terminal};
use chrono::Duration;
use std::sync::Arc;
use std::sync::{Mutex, MutexGuard};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;

thread_local! {
    static SHELL: Arc<Mutex<Shell>> = Arc::new(Mutex::new(Shell::default()));
}

/// A shell input context
#[wasm_bindgen]
pub enum ShellInputContext {
    FileInput = 0,
}

/// Shell settings
struct ShellSettings {
    /// Enable query timer
    timer: bool,
}

impl ShellSettings {
    fn default() -> Self {
        Self { timer: false }
    }
}

/// The shell is the primary entrypoint for the Javascript api.
/// It is stored as thread_local singleton and maintains all the state for the interactions with DuckDB
pub struct Shell {
    /// The shell settings
    settings: ShellSettings,
    /// The actual xterm terminal instance
    terminal: Terminal,
    /// The runtime
    runtime: Option<ShellRuntime>,
    /// The current line buffer
    input: PromptBuffer,
    /// The input is enabled
    input_enabled: bool,
    /// The input clock
    input_clock: u64,
    /// The database (if any)
    db: Option<Arc<Mutex<duckdb::AsyncDuckDB>>>,
    /// The connection (if any)
    db_conn: Option<Arc<Mutex<duckdb::AsyncDuckDBConnection>>>,
}

impl Shell {
    /// Construct a shell
    fn default() -> Self {
        Self {
            settings: ShellSettings::default(),
            terminal: Terminal::construct(None),
            runtime: None,
            input: PromptBuffer::default(),
            input_enabled: false,
            input_clock: 0,
            db: None,
            db_conn: None,
        }
    }

    /// Attach to a terminal
    pub fn attach(&mut self, term: Terminal, runtime: ShellRuntime) {
        self.terminal = term;
        self.runtime = Some(runtime);
        self.input.configure(&self.terminal);

        // Register on_key callback
        let callback =
            Closure::wrap(
                Box::new(move |e: OnKeyEvent| match Shell::global().try_lock() {
                    Ok(s) => Shell::on_key(s, e),
                    Err(_) => return,
                }) as Box<dyn FnMut(_)>,
            );
        self.terminal.on_key(callback.as_ref().unchecked_ref());
        callback.forget();
    }

    /// Attach to a database
    pub async fn configure_database(&mut self, db: AsyncDuckDB) -> Result<(), js_sys::Error> {
        // Teardown state (if there is any)
        if self.db_conn.is_some() {
            // XXX disconnect
        }

        // Store database
        self.db_conn = None;
        self.db = Some(Arc::new(Mutex::new(db)));
        self.write_version_info().await;

        // Create connection
        self.db_conn = Some(Arc::new(Mutex::new(
            AsyncDuckDB::connect(self.db.clone().unwrap().clone()).await?,
        )));
        self.write_connection_ready();

        // Write the first prompt and set focus
        self.prompt();
        self.focus();
        Ok(())
    }

    /// Write directly to the terminal
    fn write(&self, text: &str) {
        self.terminal.write(text);
    }

    /// Write directly to the terminal with newline
    fn writeln(&self, text: &str) {
        self.terminal.write(&format!("{}{}", text, vt100::CRLF));
    }

    /// Clear the screen
    pub fn clear(&mut self) {
        self.terminal.write(&format!(
            "{clear_screen}{cursor_home}",
            clear_screen = vt100::CLEAR_SCREEN,
            cursor_home = vt100::CURSOR_HOME
        ));
        self.prompt();
    }

    /// Block all input
    pub fn block_input(&mut self) {
        self.input_enabled = false;
    }

    /// Resume after user input
    pub fn resume_after_input(&mut self, _ctx: ShellInputContext) {
        self.prompt();
    }

    /// Command handler
    pub async fn on_command(text: String) {
        let shell_ptr = Shell::global().clone();
        let mut shell = shell_ptr.lock().unwrap();
        let trimmed = text.trim();
        shell.writeln(""); // XXX We could validate the input first and preserve the prompt

        match &trimmed[..trimmed.find(" ").unwrap_or(trimmed.len())] {
            ".clear" => {
                shell.clear();
                return;
            }
            ".help" => shell.writeln("Not implemented yet"),
            ".config" => shell.writeln("Not implemented yet"),
            ".quit" => shell.writeln("Not implemented yet"),
            ".timer" => {
                if trimmed.ends_with("on") {
                    shell.settings.timer = true;
                    shell.writeln("Timer enabled");
                } else if trimmed.ends_with("off") {
                    shell.settings.timer = false;
                    shell.writeln("Timer disabled");
                } else {
                    shell.writeln("Usage: .timer [on/off]")
                }
            }
            ".files" => match shell.runtime {
                Some(ref rt) => {
                    rt.open_file_explorer();
                    return;
                }
                None => {
                    shell.writeln("Shell runtime not set");
                }
            },
            cmd => shell.writeln(&format!("Unknown command: {}", &cmd)),
        }
        shell.prompt();
    }

    /// Command handler
    async fn on_sql(text: String) {
        let shell_ptr = Shell::global().clone();
        let mut shell = shell_ptr.lock().unwrap();
        shell.writeln(""); // XXX We could validate the input first and preserve the prompt

        // Get the connection
        let maybe_conn = shell.db_conn.clone();
        let conn = match maybe_conn {
            Some(ref conn) => conn.lock().unwrap(),
            None => {
                shell.writeln("Error: connection not set");
                shell.prompt();
                return;
            }
        };

        // Run the query
        let start = now();
        let batches = match conn.run_query(&text).await {
            Ok(batches) => batches,
            Err(e) => {
                let mut msg: String = e.message().into();
                msg = msg.replace("\n", "\r\n");
                shell.writeln(&format!("Error: {}{}", &msg, vt100::CRLF));
                shell.prompt();
                return;
            }
        };
        let elapsed = if shell.settings.timer {
            Duration::milliseconds((now() - start) as i64)
        } else {
            Duration::milliseconds(0)
        };

        // Print the table
        let pretty_table =
            pretty_format_batches_fmt(&batches, &FORMAT_BOX_CHARS).unwrap_or_default();
        shell.write(&pretty_table);

        // Print elapsed time (if requested)
        if shell.settings.timer {
            shell.writeln(&format!(
                "{bold}Elapsed:{normal} {elapsed}",
                elapsed = pretty_elapsed(&elapsed),
                bold = vt100::MODE_BOLD,
                normal = vt100::MODES_OFF,
            ));
        }

        shell.writeln("");
        shell.prompt();
    }

    /// Flush output buffer to the terminal
    pub fn flush(&mut self) {
        self.input.flush(&self.terminal);
    }

    /// Highlight input text (if sql)
    fn highlight_input(mut shell: MutexGuard<Shell>) {
        let input = shell.input.collect();
        if input.trim_start().starts_with(".") {
            return;
        }
        let db_ptr = shell.db.clone().unwrap();
        let expected_clock = shell.input_clock;
        drop(shell);
        spawn_local(async move {
            let db = db_ptr.lock().unwrap();
            let tokens = match db.tokenize(&input).await {
                Ok(t) => t,
                Err(_) => return,
            };
            let shell_ptr = Shell::global().clone();
            let mut shell = shell_ptr.lock().unwrap();
            if shell.input_clock != expected_clock {
                return;
            }
            shell.input.highlight_sql(tokens);
            shell.flush();
        });
    }

    /// Process on-key event
    fn on_key(mut shell: MutexGuard<Shell>, e: OnKeyEvent) {
        if !shell.input_enabled {
            return;
        }
        let event = e.dom_event();
        match event.key_code() {
            vt100::KEY_ENTER => {
                shell.input_clock += 1;
                // Is a command?
                let input = shell.input.collect();
                if input.trim_start().starts_with(".") {
                    shell.block_input();
                    drop(shell);
                    spawn_local(Shell::on_command(input));
                } else {
                    // Ends with semicolon?
                    if input.trim_end().ends_with(";") {
                        shell.block_input();
                        drop(shell);
                        spawn_local(Shell::on_sql(input));
                    } else {
                        shell.input.consume(event);
                        shell.flush();
                    }
                }
            }
            vt100::KEY_BACKSPACE
            | vt100::KEY_ARROW_DOWN
            | vt100::KEY_ARROW_LEFT
            | vt100::KEY_ARROW_RIGHT
            | vt100::KEY_ARROW_UP => {
                shell.input_clock += 1;
                shell.input.consume(event);
                shell.flush();
            }
            _ => {
                shell.input_clock += 1;
                shell.input.consume(event);
                shell.flush();
                Shell::highlight_input(shell);
            }
        }
    }

    /// Write greeter
    async fn write_version_info(&self) {
        let db = match self.db {
            Some(ref db) => db.lock().unwrap(),
            None => return,
        };
        self.write(&format!(
            "{clear_screen}{reset_cursor}{bold}DuckDB Web Shell{normal}{endl}",
            reset_cursor = vt100::CURSOR_HOME,
            clear_screen = vt100::CLEAR_SCREEN,
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
            endl = vt100::CRLF
        ));

        let version = db.get_version().await.unwrap();
        self.write(&format!(
            "Database: {bold}{version}{normal}{endl}Package:  {bold}{package}{normal}{endl}",
            version = version,
            package = "@duckdb/duckdb-wasm@0.0.1",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
            endl = vt100::CRLF
        ));

        let features = db.get_feature_flags().await.unwrap();
        self.write(&format!(
            "Features: wasm-eh={eh} wasm-threads={threads} parquet=on{endl}{endl}",
            eh = if (features & 0b1) != 0 { "on" } else { "off" },
            threads = if (features & 0b10) != 0 { "on" } else { "off" },
            endl = vt100::CRLF
        ));
    }

    fn write_connection_ready(&self) {
        self.write(&format!("Connected to a {bold}transient in-browser database{normal}.{endl}Enter \".help\" for usage hints.{endl}{endl}",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
            endl = vt100::CRLF
        ));
    }

    /// Write the prompt
    fn prompt(&mut self) {
        self.input.start_new();
        self.input.flush(&self.terminal);
        self.input_enabled = true;
    }

    /// Focus on the terminal
    pub fn focus(&self) {
        self.terminal.focus();
    }

    pub fn global() -> Arc<Mutex<Shell>> {
        SHELL.with(|s| s.clone())
    }
}
