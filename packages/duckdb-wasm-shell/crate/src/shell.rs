use crate::arrow_printer::pretty_format_batches_fmt;
use crate::duckdb;
use crate::duckdb::AsyncDuckDB;
use crate::prettytable::format::consts::FORMAT_BOX_CHARS;
use crate::utils::{now, pretty_elapsed};
use crate::vt100;
use crate::xterm::{OnKeyEvent, Terminal};
use chrono::Duration;
use std::mem::swap;
use std::sync::Arc;
use std::sync::Mutex;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;

thread_local! {
    static SHELL: Arc<Mutex<Shell>> = Arc::new(Mutex::new(Shell::default()));
}

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
    /// The current line buffer
    input: String,
    /// The cursor column
    cursor_column: usize,
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
            input: String::new(),
            cursor_column: 0,
            db: None,
            db_conn: None,
        }
    }

    /// Command handler
    pub async fn on_command(text: String) {
        let shellg = Shell::global().clone();
        let mut shell = shellg.lock().unwrap();
        let trimmed = text.trim();
        match &trimmed[..trimmed.find(" ").unwrap_or(trimmed.len())] {
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
            ".show" => shell.writeln("Not implemented yet"),
            ".load" => shell.writeln("Not implemented yet"),
            cmd => shell.writeln(&format!("Unknown command: {}", &cmd)),
        }

        shell.write_prompt();
    }

    /// Command handler
    pub async fn on_sql(text: String) {
        let shellg = Shell::global().clone();
        let shell = shellg.lock().unwrap();

        // Get the connection
        let conn = match shell.db_conn {
            Some(ref conn) => conn.lock().unwrap(),
            None => {
                shell.writeln("Error: connection not set");
                shell.write_prompt();
                return;
            }
        };

        // Run the query
        let start = now();
        let batches = match conn.run_query(&text).await {
            Ok(batches) => batches,
            Err(e) => {
                let msg: String = e.message().into();
                shell.writeln(&format!("Error: {}", &msg));
                shell.write_prompt();
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
        shell.write_prompt();
    }

    /// Process on-key event
    pub fn on_key(&mut self, e: OnKeyEvent) {
        let event = e.dom_event();
        match event.key_code() {
            vt100::KEY_ENTER => {
                // Is a command?
                if self.input.trim_start().starts_with(".") {
                    self.terminal.writeln("");
                    let mut text = String::new();
                    swap(&mut text, &mut self.input);
                    spawn_local(Shell::on_command(text));
                } else {
                    // Ends with semicolon?
                    if self.input.trim_end().ends_with(";") {
                        self.terminal.writeln("");
                        let mut text = String::new();
                        swap(&mut text, &mut self.input);
                        spawn_local(Shell::on_sql(text));
                    } else {
                        // Otherwise we wait it
                        self.input += "\r\n";
                        self.terminal.write("\r\n   ...> ");
                    }
                }
            }
            vt100::KEY_BACKSPACE => {
                if self.cursor_column > 0 {
                    self.terminal.write("\u{0008} \u{0008}");
                    self.input.pop();
                    self.cursor_column -= 1;
                }
            }
            vt100::KEY_LEFT_ARROW => {
                if self.cursor_column > 0 {
                    self.terminal.write(vt100::CURSOR_LEFT);
                    self.cursor_column -= 1;
                }
            }
            vt100::KEY_RIGHT_ARROW => {
                if self.cursor_column < self.input.len() {
                    self.terminal.write(vt100::CURSOR_RIGHT);
                    self.cursor_column += 1;
                }
            }
            vt100::KEY_L if event.ctrl_key() => self.terminal.clear(),
            vt100::KEY_C if event.ctrl_key() => {
                self.write_prompt();
                self.input.clear();
                self.cursor_column = 0;
            }
            _ => {
                if !event.alt_key() && !event.alt_key() && !event.ctrl_key() && !event.meta_key() {
                    self.terminal.write(&event.key());
                    self.input.push_str(&e.key());
                    self.cursor_column += 1;
                }
            }
        }
    }

    /// Attach to a terminal
    pub fn attach_terminal(&mut self, term: Terminal) {
        self.terminal = term;

        // Register on_key callback
        let callback = Closure::wrap(Box::new(move |e: OnKeyEvent| {
            Shell::global().lock().unwrap().on_key(e);
        }) as Box<dyn FnMut(_)>);
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
        self.write_prompt();
        self.focus();

        Ok(())
    }

    /// Write directly to the terminal
    pub fn write(&self, text: &str) {
        self.terminal.write(text);
    }

    /// Write directly to the terminal with newline
    pub fn writeln(&self, text: &str) {
        self.terminal.writeln(text);
    }

    /// Write greeter
    pub async fn write_version_info(&self) {
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
            endl = vt100::ENDLINE
        ));

        let version = db.get_version().await.unwrap();
        self.write(&format!(
            "Database: {bold}{version}{normal}{endl}Package:  {bold}{package}{normal}{endl}",
            version = version,
            package = "@duckdb/duckdb-wasm@0.0.1",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
            endl = vt100::ENDLINE
        ));

        let features = db.get_feature_flags().await.unwrap();
        self.write(&format!(
            "Features: wasm-eh={eh} wasm-threads={threads} parquet=on{endl}{endl}",
            eh = if (features & 0b1) != 0 { "on" } else { "off" },
            threads = if (features & 0b10) != 0 { "on" } else { "off" },
            endl = vt100::ENDLINE
        ));
    }

    pub fn write_connection_ready(&self) {
        self.write(&format!("Connected to a {bold}transient in-browser database{normal}.{endl}Enter \".help\" for usage hints.{endl}{endl}",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
            endl = vt100::ENDLINE
        ));
    }

    /// Write before the current prompt
    pub fn write_before(&self, text: &str) {
        self.terminal.write(&format!(
            "{}{}{}{}{}{}",
            vt100::CLEAR_LINE,
            vt100::REWIND,
            text,
            vt100::ENDLINE,
            self.prompt(),
            &self.input,
        ));
    }

    /// Get the prompt
    pub fn prompt(&self) -> String {
        return format!(
            "{bold}{prompt}{normal}> ",
            prompt = "duckdb",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
        );
    }

    /// Write the prompt
    pub fn write_prompt(&self) {
        self.write(&self.prompt());
    }

    /// Focus on the terminal
    pub fn focus(&self) {
        self.terminal.focus();
    }

    pub fn global() -> Arc<Mutex<Shell>> {
        SHELL.with(|s| s.clone())
    }
}
