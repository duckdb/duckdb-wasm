use wasm_bindgen::prelude::*;

/// A token type
#[repr(u8)]
pub enum TokenType {
    Identifier = 0,
    NumericConstant = 1,
    StringConstant = 2,
    Operator = 3,
    Keyword = 4,
    Comment = 5,
}

impl From<u8> for TokenType {
    fn from(value: u8) -> Self {
        value.into()
    }
}

/// Script tokens
pub struct ScriptTokens {
    pub offsets: Vec<u64>,
    pub types: Vec<TokenType>,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "ScriptTokens")]
    pub type JsScriptTokens;
    #[wasm_bindgen(method, getter, js_name = "offsets")]
    pub fn get_offsets(this: &JsScriptTokens) -> Vec<u64>;
    #[wasm_bindgen(method, getter, js_name = "types")]
    pub fn get_types(this: &JsScriptTokens) -> Vec<u8>;
}

impl From<JsScriptTokens> for ScriptTokens {
    fn from(tokens: JsScriptTokens) -> Self {
        Self {
            offsets: tokens.get_offsets(),
            types: tokens.get_types().into_iter().map(|v| v.into()).collect()
        }
    }
}
