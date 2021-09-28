use log::{Level, Log, Metadata, Record};
use wasm_bindgen::prelude::*;

pub const DEFAULT_LOGGER: ConsoleLogger = ConsoleLogger {
    formatter: &format_message,
    log_level: Level::Trace,
};

fn format_message(record: &Record) -> String {
    if record.level() >= Level::Debug {
        format!("{}: {}", record.level(), record.args())
    } else {
        format!("{}", record.args())
    }
}

/// Formats a `log::Record` as a `String`
pub type RecordFormatter = dyn Fn(&Record) -> String + Send + Sync;

/// Logs messages to the Web browser's console
///
/// Error and warning messages will be logged with `console.error()` and `console.warn()`, respectively.
/// All other messages will be logged with `console.log()`.
pub struct ConsoleLogger {
    formatter: &'static RecordFormatter,
    log_level: Level,
}

impl ConsoleLogger {
    /// Constructs a new `ConsoleLogger`
    ///
    /// The given function will be used to format the logged messages.
    pub fn new(formatter: &'static RecordFormatter, log_level: Level) -> Self {
        ConsoleLogger {
            formatter,
            log_level,
        }
    }

    /// Constructs a `ConsoleLogger` with the given maximum log level
    ///
    /// A default log formatter will be used.
    pub fn with_level(level: Level) -> Self {
        ConsoleLogger::new(&format_message, level)
    }
}

impl Default for ConsoleLogger {
    fn default() -> Self {
        DEFAULT_LOGGER
    }
}

impl Log for ConsoleLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= self.log_level
    }

    #[allow(unused_unsafe)]
    fn log(&self, record: &Record) {
        if self.enabled(record.metadata()) {
            let msg = (self.formatter)(record);
            match record.level() {
                Level::Error => unsafe { error(&msg) },
                Level::Warn => unsafe { warn(&msg) },
                _ => unsafe { log(&msg) },
            }
        }
    }

    fn flush(&self) {}
}

// Bindings to console functions
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace=console)]
    pub fn log(text: &str);
    #[wasm_bindgen(js_namespace=console)]
    pub fn warn(text: &str);
    #[wasm_bindgen(js_namespace=console)]
    pub fn error(text: &str);
}
