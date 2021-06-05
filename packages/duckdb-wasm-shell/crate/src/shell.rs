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
use std::sync::Mutex;
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
            db: None,
            db_conn: None,
        }
    }

    /// Block all input
    pub fn block_input(&mut self) {
        self.input_enabled = false;
    }

    /// Resume after user input
    pub fn resume_after_input(&mut self, _ctx: ShellInputContext) {
        self.writeln("Resume after input");
        self.prompt();
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
    pub async fn on_sql(text: String) {
        let shellg = Shell::global().clone();
        let mut shell = shellg.lock().unwrap();
        {
            // Get the connection
            let conn = match shell.db_conn {
                Some(ref conn) => conn.lock().unwrap(),
                None => {
                    shell.writeln("Error: connection not set");
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
        }
        shell.writeln("");
        shell.prompt();
    }

    /// Process on-key event
    pub fn on_key(&mut self, e: OnKeyEvent) {
        if !self.input_enabled {
            return;
        }
        let event = e.dom_event();
        match event.key_code() {
            vt100::KEY_ENTER => {
                // Is a command?
                let input = self.input.get_input();
                if input.trim_start().starts_with(".") {
                    self.block_input();
                    spawn_local(Shell::on_command(input));
                } else {
                    // Ends with semicolon?
                    if input.trim_end().ends_with(";") {
                        self.block_input();
                        spawn_local(Shell::on_sql(input));
                    } else {
                        self.input.consume(event);
                        self.input.flush(&self.terminal);
                    }
                }
            }
            _ => {
                self.input.consume(event);
                self.input.flush(&self.terminal);
            }
        }
    }

    /// Attach to a terminal
    pub fn attach(&mut self, term: Terminal, runtime: ShellRuntime) {
        self.terminal = term;
        self.runtime = Some(runtime);
        self.input.configure(&self.terminal);

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
        self.prompt();
        self.focus();
        Ok(())
    }

    /// Write directly to the terminal
    pub fn write(&self, text: &str) {
        self.terminal.write(text);
    }

    /// Write directly to the terminal with newline
    pub fn writeln(&self, text: &str) {
        self.terminal.write(&format!("{}{}", text, vt100::CRLF));
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

    pub fn write_connection_ready(&self) {
        self.write(&format!("Connected to a {bold}transient in-browser database{normal}.{endl}Enter \".help\" for usage hints.{endl}{endl}",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
            endl = vt100::CRLF
        ));
    }

    /// Write the prompt
    pub fn prompt(&mut self) {
        self.input.reset();
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
