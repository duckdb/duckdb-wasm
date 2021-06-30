use chrono::Duration;
use std::cmp;
use web_sys;

pub fn now() -> f64 {
    web_sys::window()
        .expect("should have a Window")
        .performance()
        .expect("should have a Performance")
        .now()
}

pub fn pretty_elapsed(d: &Duration) -> String {
    if d.num_seconds() == 0 {
        return format!("{} ms", d.num_milliseconds());
    }
    if d.num_minutes() == 0 {
        return format!(
            "{:0>2}.{:0>3} s",
            d.num_seconds(),
            d.num_milliseconds() % 1000
        );
    }
    if d.num_hours() == 0 {
        return format!(
            "{:0>2}:{:0>2}.{:0>3}",
            d.num_minutes(),
            d.num_seconds() % 60,
            d.num_milliseconds() % 1000
        );
    }
    return format!(
        "{:0>2}:{:0>2}:{:0>2}.{:0>3}",
        d.num_hours(),
        d.num_minutes() % 60,
        d.num_seconds() % 60,
        d.num_milliseconds() % 1000
    );
}

pub fn pretty_bytes(num: f64) -> String {
    let negative = if num.is_sign_positive() { "" } else { "-" };
    let num = num.abs();
    let units = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    if num < 1_f64 {
        return format!("{}{} {}", negative, num, "B");
    }
    let delimiter = 1000_f64;
    let exponent = cmp::min(
        (num.ln() / delimiter.ln()).floor() as i32,
        (units.len() - 1) as i32,
    );
    let pretty_bytes = format!("{:.2}", num / delimiter.powi(exponent))
        .parse::<f64>()
        .unwrap()
        * 1_f64;
    let unit = units[exponent as usize];
    format!("{}{} {}", negative, pretty_bytes, unit)
}
