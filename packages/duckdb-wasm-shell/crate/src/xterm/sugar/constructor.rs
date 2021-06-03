use super::super::{
    BufferRange, FunctionIdentifier, Link, LinkDecorations, LinkMatcherOptions, LinkProvider,
    Terminal, TerminalOptions, Theme, UnicodeVersionProvider, WindowOptions,
};
use wasm_bindgen::JsCast;

impl Terminal {
    pub fn new(options: &TerminalOptions) -> Self {
        Terminal::construct(Some(&options))
    }
}

impl Default for Terminal {
    fn default() -> Self {
        Terminal::construct(None)
    }
}

impl TerminalOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}

impl Theme {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}

impl LinkMatcherOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}

impl WindowOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}

impl LinkProvider {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}

impl Link {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}

impl LinkDecorations {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}

impl BufferRange {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}

impl FunctionIdentifier {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}

impl UnicodeVersionProvider {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }
}
