use crate::duckdb;
use crate::duckdb::AsyncDuckDB;
use crate::term_codes;
use crate::xterm::{OnKeyEvent, Terminal};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

const PROMPT: &str = "duckdb> ";

thread_local! {
    static SHELL: RefCell<Shell> = RefCell::new(Shell::default());
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
    db: Option<Rc<RefCell<duckdb::AsyncDuckDB>>>,
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
            Shell::global_mut(|s| s.on_key(e));
        }) as Box<dyn FnMut(_)>);
        self.terminal.on_key(callback.as_ref().unchecked_ref());
        callback.forget();
    }

    /// Attach to a database
    pub fn attach_async_database(&mut self, db: AsyncDuckDB) {
        // Teardown state (if there is any)
        if self.db_conn.is_some() {
            // XXX disconnect
        }
        self.db_conn = None;
        self.db = Some(Rc::new(RefCell::new(db)));
    }

    /// Write the DuckDB logo
    pub fn write_logo(&self) {
        self.terminal.writeln("   ▄▄███▄▄           ");
        self.terminal.writeln(" ███████████         ");
        self.terminal.writeln("█████████████  ███▄  ");
        self.terminal.writeln("█████████████  ███▀  ");
        self.terminal.writeln(" ███████████         ");
        self.terminal.writeln("   ▀▀███▀▀           ");
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

    pub fn focus(&self) {
        self.terminal.focus();
    }

    /// Access the global shell object
    pub fn global<F, R>(f: F) -> R
    where
        F: FnOnce(&Shell) -> R,
    {
        SHELL.with(|r| f(&r.borrow()))
    }

    /// Access the global shell object mutably
    pub fn global_mut<F, R>(f: F) -> R
    where
        F: FnOnce(&mut Shell) -> R,
    {
        SHELL.with(|r| f(&mut r.borrow_mut()))
    }
}
