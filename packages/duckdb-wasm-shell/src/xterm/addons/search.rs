use crate::xterm::{Terminal, TerminalAddon};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

#[wasm_bindgen(module = "xterm-addon-search")]
extern "C" {

    #[wasm_bindgen(js_name = "ISearchOptions")]
    pub type SearchOptions;

    #[wasm_bindgen(method, setter, js_name = "regex")]
    pub fn set_regex(this: &SearchOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "wholeWord")]
    pub fn set_whole_word(this: &SearchOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "caseSensitive")]
    pub fn set_case_sensitive(this: &SearchOptions, val: bool);

    #[wasm_bindgen(method, setter, js_name = "incremental")]
    pub fn set_incremental(this: &SearchOptions, val: bool);

    // ========================================================================

    #[wasm_bindgen(extends = TerminalAddon)]
    pub type SearchAddon;

    #[wasm_bindgen(constructor)]
    pub fn new() -> SearchAddon;

    #[wasm_bindgen(method, method, js_name = "activate")]
    pub fn activate(this: &SearchAddon, terminal: Terminal);

    #[wasm_bindgen(method, method, js_name = "dispose")]
    pub fn dispose(this: &SearchAddon);

    #[wasm_bindgen(method, method, js_name = "findNext")]
    pub fn find_next(this: &SearchAddon, term: &str, search_options: Option<SearchOptions>)
        -> bool;

    #[wasm_bindgen(method, method, js_name = "findPrevious")]
    pub fn find_previous(
        this: &SearchAddon,
        term: &str,
        search_options: Option<SearchOptions>,
    ) -> bool;
}

impl SearchOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }

    pub fn with_regex(&self, val: bool) -> &Self {
        self.set_regex(val);
        self
    }

    pub fn with_whole_word(&self, val: bool) -> &Self {
        self.set_whole_word(val);
        self
    }

    pub fn with_case_sensitive(&self, val: bool) -> &Self {
        self.set_case_sensitive(val);
        self
    }

    pub fn with_incremental(&self, val: bool) -> &Self {
        self.set_incremental(val);
        self
    }
}
