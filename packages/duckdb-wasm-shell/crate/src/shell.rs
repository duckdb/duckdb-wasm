use crate::duckdb;
use crate::duckdb::AsyncDuckDB;
use crate::term_codes;
use crate::xterm::{OnKeyEvent, Terminal};
use indoc::indoc;
use std::sync::Arc;
use std::sync::Mutex;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

const PROMPT: &str = "duckdb> ";

thread_local! {
    static SHELL: Arc<Mutex<Shell>> = Arc::new(Mutex::new(Shell::default()));
}

/// The shell is the primary entrypoint for the Javascript api.
/// It is stored as thread_local singleton and maintains all the state for the interactions with DuckDB
pub struct Shell {
    /// The actual xterm terminal instance
    terminal: Terminal,
    /// The current line buffer
    line: String,
    /// The cursor column
    cursor_column: usize,
    /// The database (if any)
    db: Option<Arc<Mutex<duckdb::AsyncDuckDB>>>,
    /// The connection (if any)
    db_conn: Option<duckdb::AsyncDuckDBConnection>,
}

impl Shell {
    /// Construct a shell
    fn default() -> Self {
        Self {
            terminal: Terminal::construct(None),
            line: String::new(),
            cursor_column: 0,
            db: None,
            db_conn: None,
        }
    }

    /// Process on-key event
    pub fn on_key(&mut self, e: OnKeyEvent) {
        let event = e.dom_event();
        match event.key_code() {
            term_codes::KEY_ENTER => {
                if !self.line.is_empty() {
                    self.terminal.writeln("");
                    self.terminal.writeln(&format!(
                        "You entered {} characters '{}'",
                        self.line.len(),
                        self.line
                    ));
                    self.line.clear();
                    self.cursor_column = 0;
                }
                self.write_prompt();
            }
            term_codes::KEY_BACKSPACE => {
                if self.cursor_column > 0 {
                    self.terminal.write("\u{0008} \u{0008}");
                    self.line.pop();
                    self.cursor_column -= 1;
                }
            }
            term_codes::KEY_LEFT_ARROW => {
                if self.cursor_column > 0 {
                    self.terminal.write(term_codes::CURSOR_LEFT);
                    self.cursor_column -= 1;
                }
            }
            term_codes::KEY_RIGHT_ARROW => {
                if self.cursor_column < self.line.len() {
                    self.terminal.write(term_codes::CURSOR_RIGHT);
                    self.cursor_column += 1;
                }
            }
            term_codes::KEY_L if event.ctrl_key() => self.terminal.clear(),
            term_codes::KEY_C if event.ctrl_key() => {
                self.write_prompt();
                self.line.clear();
                self.cursor_column = 0;
            }
            _ => {
                if !event.alt_key() && !event.alt_key() && !event.ctrl_key() && !event.meta_key() {
                    self.terminal.write(&event.key());
                    self.line.push_str(&e.key());
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
    pub async fn attach_async_database(&mut self, db: AsyncDuckDB) {
        // Teardown state (if there is any)
        if self.db_conn.is_some() {
            // XXX disconnect
        }

        let version = db.get_version().await.unwrap();
        self.terminal.write(&version);

        self.db_conn = None;
        self.db = Some(Arc::new(Mutex::new(db)));
    }

    /// Write the DuckDB logo
    pub fn write_logo(&self) {
        self.terminal.writeln(indoc! {"
              ▄▄█████▄▄
             ███████████
            █████████████  ███▄
            █████████████  ███▀
             ███████████
              ▀▀█████▀▀
        "});
    }

    /// Write a prompt
    pub fn write_prompt(&self) {
        self.terminal.writeln("");
        self.terminal.write(PROMPT);
    }

    /// Write the initial greeter
    pub fn write_greeter(&self) {
        self.terminal.write(PROMPT);
    }

    /// Focus on the terminal
    pub fn focus(&self) {
        self.terminal.focus();
    }

    pub fn global() -> Arc<Mutex<Shell>> {
        SHELL.with(|s| s.clone())
    }
}
