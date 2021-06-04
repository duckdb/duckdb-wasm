use chrono::Duration;
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
