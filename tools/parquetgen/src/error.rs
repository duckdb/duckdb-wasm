use std::error;
use std::fmt;

#[derive(Debug)]
pub struct Error {
    message: String,
}

impl Error {
    pub fn new(msg: String) -> Box<Self> {
        Box::new(Self { message: msg })
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl error::Error for Error {
    fn description(&self) -> &str {
        &self.message
    }
}
