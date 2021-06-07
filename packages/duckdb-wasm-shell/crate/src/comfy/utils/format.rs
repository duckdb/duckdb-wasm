use super::super::cell::Cell;
use super::super::row::Row;
use super::super::style::CellAlignment;
use super::super::table::Table;
use super::column_display_info::ColumnDisplayInfo;
use super::split::split_line;

/// Returns the formatted content of the table.
/// The content is organized in the following structure
///
/// tc stands for table content and represents the returned value
/// ``` text
///      column1          column2
/// row1 tc[0][0][0]      tc[0][0][1]
///      tc[0][1][0]      tc[0][1][1]
///      tc[0][2][0]      tc[0][2][1]
///
/// row2 tc[1][0][0]      tc[1][0][1]
///      tc[1][1][0]      tc[1][1][1]
///      tc[1][2][0]      tc[1][2][1]
/// ```
///
/// The strings for each row will be padded and aligned according to their respective column.
pub fn format_content(table: &Table, display_info: &[ColumnDisplayInfo]) -> Vec<Vec<Vec<String>>> {
    // The content of the whole table
    let mut table_content = Vec::new();

    // Format table header if it exists
    if let Some(header) = table.get_header() {
        table_content.push(format_row(header, display_info, table));
    }

    for row in table.rows.iter() {
        table_content.push(format_row(row, display_info, table));
    }
    table_content
}

pub fn format_row(
    row: &Row,
    display_infos: &[ColumnDisplayInfo],
    table: &Table,
) -> Vec<Vec<String>> {
    // The content of this specific row
    let mut temp_row_content = Vec::new();

    let mut cell_iter = row.cells.iter();
    // Now iterate over all cells and handle them according to their alignment
    for info in display_infos.iter() {
        if info.is_hidden() {
            cell_iter.next();
            continue;
        }
        // Each cell is devided into several lines devided by newline
        // Every line that's too long will be split into multiple lines
        let mut cell_lines = Vec::new();

        // Check if the row has as many cells as the table has columns.
        // If that's not the case, create a new cell with empty spaces.
        let cell = if let Some(cell) = cell_iter.next() {
            cell
        } else {
            cell_lines.push(" ".repeat(info.width() as usize));
            temp_row_content.push(cell_lines);
            continue;
        };

        // Determine, which delimiter should be used
        let delimiter = if let Some(delimiter) = cell.delimiter {
            delimiter
        } else if let Some(delimiter) = info.delimiter {
            delimiter
        } else if let Some(delimiter) = table.delimiter {
            delimiter
        } else {
            ' '
        };

        // Iterate over each line and split it into multiple lines, if necessary.
        // Newlines added by the user will be preserved.
        for line in cell.content.iter() {
            if (line.chars().count() as u16) > info.content_width() {
                let mut splitted = split_line(&line, &info, delimiter);
                cell_lines.append(&mut splitted);
            } else {
                cell_lines.push(line.into());
            }
        }

        // Remove all unneeded lines of this cell, if the row's content should be
        // truncated and there're too many lines in this cell.
        // This also inserts a '...' string so users know that there's truncated stuff.
        if let Some(lines) = row.max_height {
            if cell_lines.len() > lines {
                let _ = cell_lines.split_off(lines);
                // Direct access. We know it's this long.
                let last_line = cell_lines.get_mut(lines - 1).unwrap();
                // Don't do anything if the collumn is smaller then 6 characters
                let width = info.content_width() as usize;
                if width >= 6 {
                    // Truncate the line if '...' doesn't fit
                    if last_line.len() >= width - 3 {
                        let surplus = (last_line.len() + 3) - width;
                        last_line.truncate(last_line.len() - surplus);
                    }
                    last_line.push_str("...");
                }
            }
        }

        // Iterate over all generated lines of this cell and align them
        let cell_lines = cell_lines
            .iter()
            .map(|line| align_line(line.to_string(), info, cell));

        // Style the cell if necessary.
        if table.should_style() {
            let cell_lines = cell_lines.map(|line| style_line(line, cell));
            temp_row_content.push(cell_lines.collect());
        } else {
            temp_row_content.push(cell_lines.collect());
        }
    }

    // Right now, we have a different structure than desired.
    // The content is organized by `row->cell->line`.
    // We want to remove the cell from our datastructure, since this makes the next step a lot easier.
    // In the end it should look like this: `row->line->column`.
    // To achieve this, we calculate the max amount of lines for the current row.
    // Afterwards, we iterate over each cell and convert the current structure to the desired one.
    // This step basically transforms this:
    //  tc[0][0][0]     tc[0][1][0]
    //  tc[0][0][1]     tc[0][1][1]
    //  tc[0][0][2]     This part of the line is missing
    //
    // to this:
    //  tc[0][0][0]     tc[0][0][1]
    //  tc[0][1][0]     tc[0][1][1]
    //  tc[0][2][0]     tc[0][2][1] <- Now filled with placeholder (spaces)
    let max_lines = temp_row_content
        .iter()
        .map(|cell| cell.len())
        .max()
        .unwrap_or(0);
    let mut row_content = Vec::new();
    for index in 0..max_lines {
        let mut line = Vec::new();
        let mut cell_iter = temp_row_content.iter();
        for info in display_infos.iter() {
            if info.is_hidden() {
                continue;
            }
            let cell = cell_iter.next().unwrap();
            match cell.get(index) {
                // The current cell has content for this line. Append it
                Some(content) => line.push(content.clone()),
                // The current cell doesn't have content for this line.
                // Fill with a placeholder (empty spaces)
                None => line.push(" ".repeat(info.width() as usize)),
            }
        }
        row_content.push(line);
    }

    row_content
}

/// Apply the alignment for a column. Alignment can be either Left/Right/Center.
/// In every case all lines will be exactly the same character length `info.width - padding long`
/// This is needed, so we can simply insert it into the border frame later on.
/// Padding is applied in this function as well.
fn align_line(mut line: String, info: &ColumnDisplayInfo, cell: &Cell) -> String {
    let content_width = info.content_width();
    let remaining = content_width - line.chars().count() as u16;

    // Determine the alignment of the column cells.
    // Cell settings overwrite the columns Alignment settings.
    // Default is Left
    let alignment = if let Some(alignment) = cell.alignment {
        alignment
    } else if let Some(alignment) = info.cell_alignment {
        alignment
    } else {
        CellAlignment::Left
    };

    // Apply left/right/both side padding depending on the alignment of the column
    match alignment {
        CellAlignment::Left => {
            line += &" ".repeat(remaining as usize);
        }
        CellAlignment::Right => {
            line = " ".repeat(remaining as usize) + &line;
        }
        CellAlignment::Center => {
            let left_padding = (remaining as f32 / 2f32).ceil() as usize;
            let right_padding = (remaining as f32 / 2f32).floor() as usize;
            line = " ".repeat(left_padding) + &line + &" ".repeat(right_padding);
        }
    }

    pad_line(line, info)
}

/// Apply the column's padding to this line
fn pad_line(line: String, info: &ColumnDisplayInfo) -> String {
    let mut padded_line = String::new();

    padded_line += &" ".repeat(info.padding.0 as usize);
    padded_line += &line;
    padded_line += &" ".repeat(info.padding.1 as usize);

    padded_line
}

fn style_line(line: String, _cell: &Cell) -> String {
    // XXX Maybe make xterm specific sooner or later

    // let mut content = style(line);

    // // Apply text color
    // if let Some(color) = cell.fg {
    //     content = content.with(color);
    // }

    // // Apply background color
    // if let Some(color) = cell.bg {
    //     content = content.on(color);
    // }

    // for attribute in cell.attributes.iter() {
    //     content = content.attribute(*attribute);
    // }

    // content.to_string()

    line
}
