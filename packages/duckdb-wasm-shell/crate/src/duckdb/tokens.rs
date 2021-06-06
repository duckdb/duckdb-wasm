use wasm_bindgen::prelude::*;

/// A token type
#[repr(u8)]
#[derive(Clone, Copy)]
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
        match value {
            0 => TokenType::Identifier,
            1 => TokenType::NumericConstant,
            2 => TokenType::StringConstant,
            3 => TokenType::Operator,
            4 => TokenType::Keyword,
            _ => TokenType::Comment,
        }
    }
}

/// Script tokens
pub struct ScriptTokens {
    pub offsets: Vec<u32>,
    pub types: Vec<TokenType>,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "ScriptTokens")]
    pub type JsScriptTokens;
    #[wasm_bindgen(method, getter, js_name = "offsets")]
    pub fn get_offsets(this: &JsScriptTokens) -> Vec<u32>;
    #[wasm_bindgen(method, getter, js_name = "types")]
    pub fn get_types(this: &JsScriptTokens) -> Vec<u8>;
}

impl From<JsScriptTokens> for ScriptTokens {
    fn from(tokens: JsScriptTokens) -> Self {
        Self {
            offsets: tokens.get_offsets(),
            types: tokens
                .get_types()
                .into_iter()
                .map(|v: u8| -> TokenType { TokenType::from(v) })
                .collect(),
        }
    }
}
