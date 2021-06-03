use crate::xterm::Terminal;

const PROMPT: &str = "duckdb> ";

pub fn write_logo(term: &Terminal) {
    term.writeln("   ▄▄███▄▄           ");
    term.writeln(" ███████████         ");
    term.writeln("█████████████  ███▄  ");
    term.writeln("█████████████  ███▀  ");
    term.writeln(" ███████████         ");
    term.writeln("   ▀▀███▀▀           ");
}

pub fn prompt_nobreak(term: &Terminal) {
    term.write(PROMPT);
}

pub fn prompt(term: &Terminal) {
    term.writeln("");
    term.write(PROMPT);
}
