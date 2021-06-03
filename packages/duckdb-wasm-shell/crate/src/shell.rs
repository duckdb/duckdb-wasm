use std::cell::RefCell;

use crate::xterm::Terminal;

thread_local! {
    static SHELL: RefCell<Shell> = RefCell::new(Shell::new());
}

pub struct Shell {
    terminal: Terminal,
}

impl Shell {
    /// Construct a shell
    fn new() -> Self {
        Self {
            terminal: Terminal::construct(None),
        }
    }

    /// Attach to a terminal
    pub fn attach(&mut self, term: Terminal) {
        self.terminal = term;
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
