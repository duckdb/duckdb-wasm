use std::str::FromStr;

#[derive(PartialEq, Eq)]
pub enum Key {
    Dead,
    Enter,
    Tab,
    Backspace,
    Delete,
    ArrowUp,
    ArrowLeft,
    ArrowRight,
    ArrowDown,
    Key,
    Shift,
    Meta,
    Capslock,
    Alt,
    Char(char),
}

impl FromStr for Key {
    type Err = ();
    fn from_str(input: &str) -> Result<Key, Self::Err> {
        match input {
            "Alt" => Ok(Key::Alt),
            "ArrowDown" => Ok(Key::ArrowDown),
            "ArrowLeft" => Ok(Key::ArrowLeft),
            "ArrowRight" => Ok(Key::ArrowRight),
            "ArrowUp" => Ok(Key::ArrowUp),
            "Backspace" => Ok(Key::Backspace),
            "Capslock" => Ok(Key::Capslock),
            "Dead" => Ok(Key::Dead),
            "Delete" => Ok(Key::Delete),
            "Enter" => Ok(Key::Enter),
            "Key" => Ok(Key::Key),
            "Meta" => Ok(Key::Meta),
            "Shift" => Ok(Key::Shift),
            "Tab" => Ok(Key::Tab),
            s => {
                if input.len() == 1 {
                    return Ok(Key::Char(s.chars().next().unwrap()));
                }
                Err(())
            }
        }
    }
}

#[derive(PartialEq, Eq)]
pub struct KeyEvent {
    pub key: Key,
}

impl KeyEvent {
    pub fn from_event(event: web_sys::KeyboardEvent) -> Self {
        Self {
            key: Key::from_str(&event.key()).unwrap_or(Key::Char(' ')),
        }
    }
}
