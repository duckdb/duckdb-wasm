use std::iter::FromIterator;

use super::column_display_info::ColumnDisplayInfo;

/// Split a line if it's longer than the allowed columns (width - padding).
///
/// This function tries to do this in a smart way, by splitting the content
/// with a given delimiter at the very beginning.
/// These "elements" then get added one-by-one to the lines, until a line is full.
/// As soon as the line is full, we add it to the result set and start a new line.
///
/// This is repeated until there're no more "elements".
///
/// Mid-element splits only occurs if a element doesn't fit in a single line by itself.
pub fn split_line(line: &str, info: &ColumnDisplayInfo, delimiter: char) -> Vec<String> {
    let mut lines = Vec::new();
    let content_width = info.content_width();

    // Split the line by the given deliminator and turn the content into a stack.
    // Reverse it, since we want to push/pop without reversing the text.
    // Also clone it and convert it into a Vec<String>. Otherwise we get some burrowing problems
    // due to early drops of borrowed values that need to be inserted into `Vec<&str>`
    let mut elements = line
        .split(delimiter)
        .map(|element| element.to_string())
        .collect::<Vec<String>>();
    elements.reverse();

    let mut current_line = String::new();
    while let Some(next) = elements.pop() {
        let current_length = current_line.chars().count();
        let next_length = next.chars().count();

        // Some helper variables
        // The length of the current line when combining it with the next element
        // Add 1 for the delimiter if we are on a non-emtpy line.
        let mut added_length = next_length + current_length;
        if !current_line.is_empty() {
            added_length += 1;
        }
        // The remaining width for this column. If we are on a non-empty line, subtract 1 for the delimiter.
        let mut remaining_width = content_width as i32 - current_line.chars().count() as i32;
        if !current_line.is_empty() {
            remaining_width -= 1;
        }

        // The next element fits into the current line
        if added_length as u16 <= content_width {
            // Only add delimiter, if we're not on a fresh line
            if !current_line.is_empty() {
                current_line.push(delimiter);
            }
            current_line += &next;

            // Already complete the current line, if there isn't space for more than two chars
            current_line = check_if_full(&mut lines, content_width, current_line);
            continue;
        }

        // The next element doesn't fit in the current line

        // Check, if there's enough space in the current line in case we decide to split the
        // element and only append a part of it to the current line.
        // If there isn't enough space, we simply push the current line, put the element back
        // on stack and start with a fresh line.
        if !current_line.is_empty() && remaining_width <= MIN_FREE_CHARS {
            elements.push(next);
            lines.push(current_line);
            current_line = String::new();

            continue;
        }

        // Ok. There's still enough space to fit something in (more than MIN_FREE_CHARS characters)
        // There are two scenarios:
        //
        // 1. The word is short enough to fit as a whole into a line
        //    In that case we simply push the current line and start a new one with the current element
        // 2. The word is too long for a single line.
        //    In this case, we have to split the element anyways. Let's fill the remaining space on
        //    the current line with, start a new line and push the remaining part on the stack.

        // Case 1
        // The element is longer than the specified content_width
        // Split the word, push the remaining string back on the stack
        if next_length as u16 > content_width {
            let mut next: Vec<char> = next.chars().collect();
            // Only add delimiter, if we're not on a fresh line
            if !current_line.is_empty() {
                current_line.push(delimiter);
            }

            let remaining = next.split_off((remaining_width) as usize);
            current_line += &String::from_iter(next);
            elements.push(String::from_iter(remaining));

            // Push the finished line, and start a new one
            lines.push(current_line);
            current_line = String::new();

            continue;
        }

        // Case 2
        // The element fits into a single line.
        // Push the current line and initialize the next line with the element.
        lines.push(current_line);
        current_line = next.to_string();
        current_line = check_if_full(&mut lines, content_width, current_line);
    }

    if !current_line.is_empty() {
        lines.push(current_line);
    }

    lines
}

/// This is the minimum of available characters per line.
/// It's used to check, whether another element can be added to the current line.
/// Otherwise the line will simply be left as it is and we start with a new one.
/// Two chars seems like a reasonable approach, since this would require next element to be
/// a single char + delimiter.
const MIN_FREE_CHARS: i32 = 2;

/// Check if the current line is too long and whether we should start a new one
/// If it's too long, we add the current line to the list of lines and return a new [String].
/// Otherwise, we simply return the current line and basically don't do anything.
fn check_if_full(lines: &mut Vec<String>, content_width: u16, current_line: String) -> String {
    // Already complete the current line, if there isn't space for more than two chars
    if current_line.chars().count() as i32 > content_width as i32 - MIN_FREE_CHARS {
        lines.push(current_line);
        return String::new();
    }

    current_line
}
