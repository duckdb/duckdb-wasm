use crate::arrow_printer::{pretty_format_batches, UTF8_BORDERS_NO_HORIZONTAL};
use crate::duckdb::{
    AsyncDuckDB, AsyncDuckDBConnection, DataProtocol, DuckDBConfig, PACKAGE_NAME, PACKAGE_VERSION,
};
use crate::key_event::{Key, KeyEvent};
use crate::platform;
use crate::prompt_buffer::PromptBuffer;
use crate::shell_options::ShellOptions;
use crate::shell_runtime::{FileInfo, ShellRuntime};
use crate::utils::{now, pretty_bytes, pretty_elapsed};
use crate::vt100;
use crate::xterm::Terminal;
use arrow::array::Array;
use arrow::array::StringArray;
use arrow::datatypes::{DataType, Field, Schema};
use arrow::record_batch::RecordBatch;
use chrono::Duration;
use log::warn;
use scopeguard::defer;
use std::cell::RefCell;
use std::collections::hash_map::Entry;
use std::collections::{HashMap, VecDeque};
use std::fmt::Write;
use std::sync::Arc;
use std::sync::RwLock;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;

thread_local! {
    static SHELL: RefCell<Shell> = RefCell::new(Shell::default());
}

const HISTORY_LENGTH: usize = 1000;

/// A shell input context
#[wasm_bindgen]
pub enum ShellInputContext {
    FileInput = 0,
}

/// Shell settings
struct ShellSettings {
    /// Enable query output
    output: bool,
    /// Enable query timer
    timer: bool,
    /// Is WebGL enabled?
    webgl: bool,
}

impl ShellSettings {
    fn default() -> Self {
        Self {
            output: true,
            timer: true,
            webgl: false,
        }
    }
}

pub enum DatabaseType {
    InMemory,
    RemoteReadOnly,
}

use std::sync::{Mutex, OnceLock};

fn past_queries() -> &'static Mutex<VecDeque<String>> {
    static ARRAY: OnceLock<Mutex<VecDeque<String>>> = OnceLock::new();
    ARRAY.get_or_init(|| Mutex::new(VecDeque::new()))
}

/// The shell is the primary entrypoint for the web shell api.
/// It is stored as thread_local singleton and maintains all the state for the interactions with DuckDB
pub struct Shell {
    /// The shell settings
    settings: ShellSettings,
    /// The actual xterm terminal instance
    terminal: Terminal,
    /// The terminal width
    terminal_width: usize,
    /// The runtime
    runtime: Option<Arc<RwLock<ShellRuntime>>>,
    /// The current line buffer
    input: PromptBuffer,
    /// The input is enabled
    input_enabled: bool,
    /// The input clock
    input_clock: u64,
    /// This history buffer
    history: VecDeque<String>,
    /// This history buffer
    history_cursor: usize,
    /// The database path
    db_path: String,
    /// The database access
    db_access: DatabaseType,
    /// The database (if any)
    db: Option<Arc<RwLock<AsyncDuckDB>>>,
    /// The connection (if any)
    db_conn: Option<Arc<RwLock<AsyncDuckDBConnection>>>,
    /// The file infos
    file_infos: HashMap<String, FileInfo>,
}

impl Shell {
    /// Construct a shell
    fn default() -> Self {
        Self {
            settings: ShellSettings::default(),
            terminal: Terminal::construct(None),
            terminal_width: 100,
            runtime: None,
            input: PromptBuffer::default(),
            input_enabled: false,
            input_clock: 0,
            history: VecDeque::new(),
            history_cursor: 0,
            db_path: ":memory:".to_string(),
            db_access: DatabaseType::InMemory,
            db: None,
            db_conn: None,
            file_infos: HashMap::new(),
        }
    }

    /// Access a file
    fn access_file<F>(&mut self, name: &str, callback: F)
    where
        F: FnOnce(&mut FileInfo),
    {
        // Get or insert file
        let file = match self.file_infos.entry(name.to_string()) {
            Entry::Occupied(o) => o.into_mut(),
            Entry::Vacant(v) => v.insert(FileInfo::from_name(name)),
        };
        // Run the user modifcations
        callback(file);
    }

    /// Attach to a terminal
    pub fn attach(&mut self, term: Terminal, runtime: ShellRuntime, options: ShellOptions) {
        self.terminal = term;
        self.terminal_width = self.terminal.get_cols() as usize;
        self.runtime = Some(Arc::new(RwLock::new(runtime)));
        self.input.configure(self.terminal_width);
        self.settings.webgl = options.with_webgl();

        // Register on_key callback
        let callback = Closure::wrap(Box::new(move |e: web_sys::KeyboardEvent| {
            Shell::on_key(e);
            false
        }) as Box<dyn FnMut(_) -> bool>);
        self.terminal
            .attach_custom_key_event_handler(callback.as_ref().unchecked_ref());
        callback.forget();
    }

    /// Attach to a database
    pub async fn configure_database(db: AsyncDuckDB) -> Result<(), js_sys::Error> {
        // Disconnect any connections
        let conn = Shell::with_mut(|s| s.db_conn.clone());
        if let Some(ref conn) = conn {
            let conn_guard = conn.read().unwrap();
            conn_guard.disconnect().await?;
        }
        // Store new database and reset the connection
        let db = Shell::with_mut(|s| {
            let db = Arc::new(RwLock::new(db));
            s.db_conn = None;
            s.db = Some(db.clone());
            db
        });

        Shell::write_version_info().await;
        let conn = AsyncDuckDB::connect(db.clone()).await?;

        // Create connection
        Shell::with_mut(|s| {
            s.db_conn = Some(Arc::new(RwLock::new(conn)));
            s.write_connection_ready();
            s.prompt();
            s.focus();
        });

        for entry in &(*past_queries().lock().unwrap()) {
            Shell::with_mut(|s| {
                s.write(&format!(
                    "{bold}{green}",
                    bold = vt100::MODE_BOLD,
                    green = vt100::COLOR_FG_BRIGHT_YELLOW
                ));
                s.write(entry);
                s.write(&format!("{normal}", normal = vt100::MODES_OFF));
            });
            Self::on_sql(entry.to_string()).await;
        }

        Ok(())
    }

    /// Load input history
    pub fn load_history(history: Vec<String>, cursor: usize) {
        let mut h = VecDeque::with_capacity(history.len());
        for entry in &history[cursor..history.len()] {
            h.push_back(entry.clone());
        }
        for entry in &history[0..cursor] {
            h.push_back(entry.clone());
        }
        Shell::with_mut(|s| {
            s.history_cursor = h.len();
            s.history = h;
        });
    }

    /// Write directly to the terminal
    pub fn write(&self, text: &str) {
        self.terminal.write(text);
    }

    /// Write directly to the terminal with newline
    pub fn writeln(&self, text: &str) {
        self.terminal.write(&format!("{}{}", text, vt100::CRLF));
    }

    /// Clear the screen
    pub fn clear(&mut self) {
        self.terminal.write(&format!(
            "{clear_screen}{cursor_home}",
            clear_screen = vt100::CLEAR_SCREEN,
            cursor_home = vt100::CURSOR_HOME
        ));
        self.prompt();
    }

    /// Block all input
    pub fn block_input(&mut self) {
        self.input_enabled = false;
    }

    /// Resume after user input
    pub fn resume_after_input(&mut self, _ctx: ShellInputContext) {
        self.prompt();
    }

    pub async fn features_command() {
        let mut buffer = String::new();
        let write_feature = |buffer: &mut String, name: &str, description: &str, value: bool| {
            write!(
                buffer,
                "{fg}{bg}{value}{normal} {feature:<24} - {description}{crlf}",
                feature = name,
                fg = if value {
                    vt100::COLOR_FG_BLACK
                } else {
                    vt100::COLOR_FG_BRIGHT_YELLOW
                },
                bg = if value {
                    vt100::COLOR_BG_BRIGHT_YELLOW
                } else {
                    vt100::COLOR_BG_BLACK
                },
                description = description,
                value = if value { " ✓ " } else { " ✗ " },
                crlf = vt100::CRLF,
                normal = vt100::MODES_OFF,
            )
            .unwrap();
        };

        let webgl = Shell::with(|s| s.settings.webgl);
        let platform = platform::PlatformFeatures::get().await;
        write!(
            buffer,
            "{crlf}{bold}Platform Compatibility:{normal}{crlf}",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
            crlf = vt100::CRLF
        )
        .unwrap();
        write_feature(
            &mut buffer,
            "BigInt64Array",
            "https://caniuse.com/?search=bigint64array",
            platform.bigint64array,
        );
        write_feature(
            &mut buffer,
            "WebGL 2 Renderer",
            "https://chromestatus.com/feature/6694359164518400",
            webgl,
        );
        write_feature(
            &mut buffer,
            "WebAssembly Exceptions",
            "https://chromestatus.com/feature/4756734233018368",
            platform.wasm_exceptions,
        );
        write_feature(
            &mut buffer,
            "WebAssembly SIMD",
            "https://chromestatus.com/feature/6533147810332672",
            platform.wasm_simd,
        );
        write_feature(
            &mut buffer,
            "WebAssembly Bulk Memory",
            "https://chromestatus.com/feature/4590306448113664",
            platform.wasm_bulk_memory,
        );
        write_feature(
            &mut buffer,
            "WebAssembly Threads",
            "https://chromestatus.com/feature/5724132452859904",
            platform.wasm_threads,
        );
        write_feature(
            &mut buffer,
            "Cross Origin Isolated",
            "Cross Origin policies allow for multi-threading",
            platform.cross_origin_isolated,
        );

        let db_ptr = Shell::with(|s| s.db.clone());
        let db = match db_ptr {
            Some(ref db) => db.read().unwrap(),
            None => return,
        };
        let db_features = db.get_feature_flags().await.unwrap();
        write!(
            buffer,
            "{crlf}{bold}DuckDB Bundle Features:{normal}{crlf}",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
            crlf = vt100::CRLF
        )
        .unwrap();
        write_feature(
            &mut buffer,
            "BigInt64Array",
            "Module uses BigInt64Arrays",
            (db_features & 0b10000) != 0,
        );
        write_feature(
            &mut buffer,
            "WebAssembly Exceptions",
            "Module uses native exceptions",
            (db_features & 0b1) != 0,
        );
        write_feature(
            &mut buffer,
            "WebAssembly SIMD",
            "Module uses SIMD instructions",
            (db_features & 0b100) != 0,
        );
        write_feature(
            &mut buffer,
            "WebAssembly Bulk Memory",
            "Module uses bulk memory operations",
            (db_features & 0b1000) != 0,
        );
        write_feature(
            &mut buffer,
            "WebAssembly Threads",
            "Module uses multiple web-workers",
            (db_features & 0b10) != 0,
        );

        Shell::with(|s| s.write(&buffer));
    }

    pub fn collect_file_statistics(name: &str, enable: bool) {
        let db_ptr = Shell::with(|s| s.db.clone());
        let name_copy = name.to_string();
        spawn_local(async move {
            let db = match db_ptr {
                Some(ref db) => db.read().unwrap(),
                None => return,
            };
            db.collect_file_statistics(&name_copy, true).await.unwrap();
            Shell::with_mut(|s| {
                s.access_file(&name_copy, |info| {
                    info.file_stats_enabled = enable;
                });
            });
        });
    }

    pub async fn open_command(args: String) {
        let db_ptr = Shell::with_mut(|s| s.db.clone());
        let db = match db_ptr {
            Some(ref db) => db.read().unwrap(),
            None => return,
        };

        // Try to open the database
        let target = &args[..args.find(' ').unwrap_or(args.len())];
        let mut config = DuckDBConfig::default();
        if !target.is_empty() {
            config.set_path(Some(target.to_string()))
        }
        if let Err(e) = db.open(config).await {
            let msg: String = e.message().into();
            Shell::with(|s| s.writeln(&msg));
            return;
        }

        // Create new connection
        Shell::write_version_info().await;
        let maybe_conn = AsyncDuckDB::connect(db_ptr.clone().unwrap()).await;
        if let Err(e) = maybe_conn {
            let msg: String = e.message().into();
            Shell::with_mut(|s| s.writeln(&msg));
            return;
        }

        // Setup new database
        Shell::with_mut(|s| {
            s.db_conn = Some(Arc::new(RwLock::new(maybe_conn.unwrap())));
            s.db_path = args.clone();
            s.db_access = match s.db_path.as_str() {
                // XXX Get this from database
                "" | ":memory:" => DatabaseType::InMemory,
                _ => DatabaseType::RemoteReadOnly,
            };
            s.write_connection_ready();
            s.prompt();
            s.focus();
        });
    }

    pub async fn files_command(args: String) {
        // Get database
        let (maybe_db, terminal_width) =
            Shell::with_mut(|shell| (shell.db.clone(), shell.terminal_width));
        let db = match maybe_db {
            Some(ref db) => db.write().unwrap(),
            None => {
                Shell::with_mut(|s| {
                    s.writeln("Error: database not set");
                });
                return;
            }
        };
        let subcmd = &args[..args.find(' ').unwrap_or_else(|| args.len())];
        match subcmd {
            "add" => {
                let rt_ptr = Shell::with_mut(|s| s.runtime.clone()).unwrap();
                match rt_ptr.clone().read().unwrap().pick_files().await {
                    Ok(js_count) => {
                        let count = js_count.as_f64().unwrap_or_default() as u32;
                        Shell::with_mut(|s| {
                            s.writeln(&format!("Added {} files", &count));
                        });
                    }
                    Err(e) => {
                        Shell::with_mut(|s| {
                            let e: String = e.to_string().into();
                            s.writeln(&e);
                        });
                    }
                }
            }
            "download" => {
                let filename = args[subcmd.len()..].trim();
                let buffer = match db.copy_file_to_buffer(filename).await {
                    Ok(u8array) => u8array,
                    Err(e) => {
                        Shell::with_mut(|s| {
                            let e: String = e.to_string().into();
                            s.writeln(&e);
                        });
                        return;
                    }
                };
                let rt_ptr = Shell::with_mut(|s| s.runtime.clone()).unwrap();
                match rt_ptr
                    .clone()
                    .read()
                    .unwrap()
                    .download_file(filename, buffer)
                    .await
                {
                    Ok(_) => {
                        Shell::with_mut(|s| {
                            s.writeln(&format!("Copied file: {}", &filename));
                        });
                    }
                    Err(e) => {
                        Shell::with_mut(|s| {
                            let e: String = e.to_string().into();
                            s.writeln(&e);
                        });
                    }
                }
            }
            "drop" => {
                let filename = args[subcmd.len()..].trim();
                if !filename.is_empty() {
                    match db.drop_file(filename).await {
                        Ok(_) => {
                            Shell::with_mut(|s| {
                                s.writeln(&format!("Dropped file: {}", &filename));
                            });
                        }
                        _ => {
                            Shell::with_mut(|s| {
                                s.writeln(&format!("Failed to drop file: {}", &filename));
                            });
                        }
                    }
                } else {
                    match db.drop_files().await {
                        Ok(()) => {
                            Shell::with_mut(|s| {
                                s.writeln("Dropped all files");
                            });
                        }
                        _ => {
                            Shell::with_mut(|s| {
                                s.writeln("Failed to drop all files");
                            });
                        }
                    }
                }
            }
            "track" => {
                let filename = args[subcmd.len()..].trim();
                db.collect_file_statistics(filename, true).await.unwrap();
                Shell::with_mut(|s| {
                    s.access_file(filename, |info| {
                        info.file_stats_enabled = true;
                    });
                    s.writeln(&format!("Tracking file statistics for: {}", filename))
                });
            }
            "reads" => {
                let filename = args[subcmd.len()..].trim();
                let stats = db.export_file_statistics(filename).await.unwrap();
                Shell::with(|s| s.write(&stats.print_read_stats(s.terminal_width)));
            }
            "paging" => {
                let filename = args[subcmd.len()..].trim();
                let stats = db.export_file_statistics(filename).await.unwrap();
                Shell::with(|s| s.write(&stats.print_page_stats(s.terminal_width)));
            }
            _ => {
                let files = match db.glob_files("*").await {
                    Ok(files) => files,
                    Err(e) => {
                        Shell::with_mut(|s| {
                            let e: String = e.to_string().into();
                            s.writeln(&e);
                        });
                        return;
                    }
                };
                let mut data_names = Vec::with_capacity(files.len());
                let mut data_sizes = Vec::with_capacity(files.len());
                let mut data_protocol = Vec::with_capacity(files.len());
                let mut data_tracking = Vec::with_capacity(files.len());
                for file in files {
                    data_names.push(file.file_name);
                    data_sizes.push(match file.file_size {
                        Some(size) => pretty_bytes(size as f64),
                        None => "unknown".to_string(),
                    });
                    data_protocol.push(format!(
                        "{:?}",
                        match file.data_protocol.unwrap_or_default() {
                            1 => DataProtocol::Native,
                            2 => DataProtocol::Http,
                            _ => DataProtocol::Buffer,
                        }
                    ));
                    data_tracking.push(format!("{}", file.collect_statistics.unwrap_or_default()));
                }

                let schema = Arc::new(Schema::new(vec![
                    Field::new("File Name", DataType::Utf8, true),
                    Field::new("File Size", DataType::Utf8, true),
                    Field::new("Protocol", DataType::Utf8, true),
                    Field::new("Statistics", DataType::Utf8, true),
                ]));
                let array_name = Arc::new(StringArray::from_iter_values(data_names.iter()));
                let array_size = Arc::new(StringArray::from_iter_values(data_sizes.iter()));
                let array_proto = Arc::new(StringArray::from_iter_values(data_protocol.iter()));
                let array_stats = Arc::new(StringArray::from_iter_values(data_tracking.iter()));
                let batch = RecordBatch::try_new(
                    schema,
                    vec![array_name, array_size, array_proto, array_stats],
                )
                .unwrap();

                Shell::with_mut(|s| {
                    if !s.settings.output {
                        return;
                    }
                    if batch.num_rows() == 0 {
                        s.writeln("No files registered");
                    } else {
                        let pretty_table = pretty_format_batches(
                            &[batch],
                            terminal_width as u16,
                            UTF8_BORDERS_NO_HORIZONTAL,
                        )
                        .unwrap_or_default();
                        s.writeln(&pretty_table);
                    }
                });
            }
        }
    }

    fn remember_command(&mut self, text: String) {
        self.history.push_back(text.clone());
        if self.history.len() > HISTORY_LENGTH {
            self.history.pop_front();
        }
        self.history_cursor = self.history.len();
        if let Some(ref rt) = self.runtime {
            let rt_copy = rt.clone();
            spawn_local(async move {
                match rt_copy.read().unwrap().push_input_to_history(&text).await {
                    Ok(_) => (),
                    Err(_e) => (),
                }
            });
        }
    }

    /// Command handler
    pub async fn on_command(text: String) {
        let trimmed = text.trim();
        Shell::with(|s| s.writeln("")); // XXX We could validate the input first and preserve the prompt

        let cmd = &trimmed[..trimmed.find(' ').unwrap_or_else(|| trimmed.len())];
        let args = trimmed[cmd.len()..].trim();
        match cmd {
            ".clear" => {
                Shell::with_mut(|s| {
                    s.remember_command(text.clone());
                    s.clear();
                });
                return;
            }
            ".help" => Shell::with(|s| {
                s.write(&format!(
                    concat!(
                        "\r\n",
                        "{bold}Commands:{normal}\r\n",
                        ".clear                 Clear the shell.\r\n",
                        ".examples              Example queries.\r\n",
                        ".features              Shell features.\r\n",
                        ".files list            List all files.\r\n",
                        ".files add             Add files.\r\n",
                        ".files download $FILE  Download a file.\r\n",
                        ".files drop            Drop all files.\r\n",
                        ".files drop $FILE      Drop a single file.\r\n",
                        ".files track $FILE     Collect file statistics.\r\n",
                        ".files paging $FILE    Show file paging.\r\n",
                        ".files reads $FILE     Show file reads.\r\n",
                        ".open $FILE            Open database file.\r\n",
                        ".reset                 Reset the shell.\r\n",
                        ".timer on|off          Turn query timer on or off.\r\n",
                        ".output on|off         Print results on or off.\r\n",
                        "\r\n",
                        "{bold}Repositories:{normal}\r\n",
                        "   https://github.com/duckdb/duckdb\r\n",
                        "   https://github.com/duckdb/duckdb-wasm\r\n",
                        "\r\n",
                        "{bold}Feedback:{normal}\r\n",
                        "   https://github.com/duckdb/duckdb-wasm/discussions\r\n"
                    ),
                    bold = vt100::MODE_BOLD,
                    normal = vt100::MODES_OFF
                ));
            }),
            ".examples" => Shell::with(|s| {
                s.write(&format!(
                    concat!(
                        "\r\n",
                        "{bold}Remote Parquet Scans:{normal}\r\n",
                        "  SELECT count(*) FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/lineitem.parquet';\r\n",
                        "  SELECT count(*) FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/customer.parquet';\r\n",
                        "  SELECT avg(c_acctbal) FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/customer.parquet';\r\n",
                        "  SELECT * FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/orders.parquet' LIMIT 10;\r\n",
                        "\r\n",
                        "{bold}Remote Parquet/Parquet Join:{normal}\r\n",
                        "  SELECT n_name, count(*)\r\n",
                        "  FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/customer.parquet',\r\n",
                        "       'https://shell.duckdb.org/data/tpch/0_01/parquet/nation.parquet'\r\n",
                        "  WHERE c_nationkey = n_nationkey GROUP BY n_name;\r\n",
                    ),
                    bold = vt100::MODE_BOLD,
                    normal = vt100::MODES_OFF
                ));
            }),
            ".reset" => Shell::with(|s| s.writeln("Not implemented yet")),
            ".features" => {
                Shell::features_command().await;
            }
            ".output" => Shell::with_mut(|s| {
                if args.ends_with("on") {
                    s.settings.output = true;
                    s.writeln("Output enabled");
                } else if args.ends_with("off") {
                    s.settings.output = false;
                    s.writeln("Output disabled");
                } else {
                    s.writeln("Usage: .Output [on/off]")
                }
            }),
            ".timer" => Shell::with_mut(|s| {
                if args.ends_with("on") {
                    s.settings.timer = true;
                    s.writeln("Timer enabled");
                } else if args.ends_with("off") {
                    s.settings.timer = false;
                    s.writeln("Timer disabled");
                } else {
                    s.writeln("Usage: .timer [on/off]")
                }
            }),
            ".open" => {
                Shell::open_command(args.to_string()).await;
                Shell::with_mut(|s| s.remember_command(text.clone()));
                return;
            }
            ".files" => {
                Shell::files_command(args.to_string()).await;
            }
            cmd => Shell::with(|s| s.writeln(&format!("Unknown command: {}", &cmd))),
        }
        Shell::with_mut(|s| {
            s.remember_command(text.clone());
            s.writeln("");
            s.prompt();
        });
    }

    /// Command handler
    async fn on_sql(text: String) {
        defer!({
            Shell::with_mut(|s| {
                s.remember_command(text.clone());
                s.writeln("");
                s.prompt();
            })
        });

        // Get the database connection
        let (maybe_conn, use_timer, terminal_width) = Shell::with(|shell| {
            shell.writeln("");
            (
                shell.db_conn.clone(),
                shell.settings.timer,
                shell.terminal_width,
            )
        });
        // Lock the connection
        let conn = match maybe_conn {
            Some(ref conn) => conn.read().unwrap(),
            None => {
                Shell::with_mut(|s| {
                    s.writeln("Error: connection not set");
                });
                return;
            }
        };

        // Run the query
        let start = now();
        let batches = match conn.run_query(&text).await {
            Ok(batches) => batches,
            Err(e) => {
                let mut msg: String = e.message().into();
                msg = msg.replace("\n", "\r\n");
                Shell::with_mut(|s| {
                    s.writeln(&msg);
                });
                return;
            }
        };
        let elapsed = if use_timer {
            Duration::milliseconds((now() - start) as i64)
        } else {
            Duration::milliseconds(0)
        };

        // Detect explain result
        if batches.len() == 1 {
            let first = batches.first().unwrap();
            let schema = &first.schema();
            let fields = schema.fields();
            if fields.len() == 2
                && fields[0].name() == "explain_key"
                && fields[1].name() == "explain_value"
                && first.num_rows() == 1
                && first.column(0).data_type().eq(&DataType::Utf8)
                && first.column(1).data_type().eq(&DataType::Utf8)
            {
                let array = first
                    .column(1)
                    .as_any()
                    .downcast_ref::<StringArray>()
                    .unwrap();
                if !array.is_null(0) {
                    let mut explain = array.value(0).to_string();
                    explain = explain.replace("\n", "\r\n");
                    Shell::with_mut(|s| {
                        s.write(&explain);
                    });
                    return;
                }
            }
        }

        Shell::with_mut(|s| {
            // Print the table
            if s.settings.output {
                let pretty_table = pretty_format_batches(
                    &batches,
                    terminal_width as u16,
                    UTF8_BORDERS_NO_HORIZONTAL,
                )
                .unwrap_or_default();
                s.writeln(&pretty_table);
            }

            // Print elapsed time (if requested)
            if s.settings.timer {
                s.writeln(&format!(
                    "{bold}Elapsed:{normal} {elapsed}",
                    elapsed = pretty_elapsed(&elapsed),
                    bold = vt100::MODE_BOLD,
                    normal = vt100::MODES_OFF,
                ));
            }
        });
    }

    /// Pass information on init queries
    pub async fn pass_init_queries(queries: Vec<String>) -> Result<(), js_sys::Error> {
        let mut h = VecDeque::with_capacity(queries.len());
        for entry in &queries[0..queries.len()] {
            h.push_back(entry.clone());
        }
        *past_queries().lock().unwrap() = h;
        Ok(())
    }

    /// Flush output buffer to the terminal
    pub fn flush(&mut self) {
        self.input.flush(&self.terminal);
    }

    /// Highlight input text (if sql)
    fn highlight_input() {
        let (input, input_clock) = Shell::with_mut(|s| (s.input.collect(), s.input_clock));
        if input.trim_start().starts_with('.') {
            return;
        }
        let db_ptr = Shell::with(|s| s.db.clone()).unwrap();
        spawn_local(async move {
            let db = match db_ptr.read() {
                Ok(guard) => guard,
                Err(_) => return,
            };
            let tokens = match db.tokenize(&input).await {
                Ok(t) => t,
                Err(_) => return,
            };
            Shell::with_mut(|s| {
                if s.input_clock != input_clock {
                    return;
                }
                s.input.highlight_sql(tokens);
                s.flush();
            });
        });
    }

    /// Process on-key event
    fn on_key(keyboard_event: web_sys::KeyboardEvent) {
        if !Shell::with(|s| s.input_enabled) {
            return;
        }
        if &keyboard_event.type_() != "keydown" {
            return;
        }
        let event = KeyEvent::from_event(keyboard_event.clone());
        match event.key {
            Key::Enter => {
                let input = Shell::with_mut(|s| {
                    s.input_clock += 1;
                    s.input.collect()
                });
                // Is a command?
                if input.trim_start().starts_with('.') {
                    Shell::with_mut(|s| s.block_input());
                    spawn_local(Shell::on_command(input));
                } else {
                    // Ends with semicolon?
                    if input.trim_end().ends_with(';') {
                        Shell::with_mut(|s| s.block_input());
                        spawn_local(Shell::on_sql(input));
                    } else {
                        Shell::with_mut(|s| {
                            s.input.consume(event);
                            s.flush();
                        });
                    }
                }
            }
            Key::ArrowUp => {
                let should_highlight = Shell::with_mut(|s| -> bool {
                    if s.history_cursor > 0 {
                        s.history_cursor -= 1;
                        s.input_clock += 1;
                        s.input.replace(&s.history[s.history_cursor]);
                        s.flush();
                        return true;
                    }
                    false
                });
                if should_highlight {
                    Shell::highlight_input();
                }
            }
            Key::ArrowDown => {
                let should_highlight = Shell::with_mut(|s| -> bool {
                    if s.history_cursor < s.history.len() {
                        s.history_cursor += 1;
                        s.input.replace(if s.history_cursor < s.history.len() {
                            s.history[s.history_cursor].as_str()
                        } else {
                            ""
                        });
                        s.input_clock += 1;
                        s.flush();
                        return true;
                    }
                    false
                });
                if should_highlight {
                    Shell::highlight_input();
                }
            }
            Key::Backspace => {
                Shell::with_mut(|s| {
                    s.input_clock += 1;
                    s.input.consume(event);
                    s.flush();
                });
                Shell::highlight_input();
            }
            Key::ArrowLeft | Key::ArrowRight => {
                Shell::with_mut(|s| {
                    s.input_clock += 1;
                    s.input.consume(event);
                    s.flush();
                });
            }
            _ => {
                if keyboard_event.ctrl_key() || keyboard_event.meta_key() {
                    spawn_local(Shell::on_key_combination(keyboard_event, event));
                    return;
                }
                Shell::with_mut(|s| {
                    s.input_clock += 1;
                    s.input.consume(event);
                    s.flush();
                });
                Shell::highlight_input();
            }
        }
    }

    /// Handle pressed key combinations such as ctrl+c & ctrl+v
    async fn on_key_combination(keyboard_event: web_sys::KeyboardEvent, event: KeyEvent) {
        let rt_ptr = Shell::with_mut(|s| s.runtime.clone()).unwrap();
        let rt = rt_ptr.read().unwrap();
        if keyboard_event.ctrl_key() || keyboard_event.meta_key() {
            match event.key {
                Key::Char('v') => match rt.read_clipboard_text().await {
                    Ok(v) => {
                        Shell::with_mut(|s| {
                            s.input
                                .insert_text(&v.as_string().unwrap_or_else(|| ' '.to_string()));
                            s.input.flush(&s.terminal);
                        });
                        Shell::highlight_input();
                    }
                    Err(e) => warn!("Failed to read from clipboard: {:?}", e.to_string()),
                },
                Key::Char('a') => {
                    Shell::with_mut(|s| {
                        s.input.move_cursor_to(0);
                        s.input.flush(&s.terminal);
                    });
                }
                Key::Char('e') => {
                    Shell::with_mut(|s| {
                        s.input.move_cursor_to_end();
                        s.input.flush(&s.terminal);
                    });
                }
                Key::Char('c') => (),
                _ => {}
            }
        }
    }

    /// Write greeter
    async fn write_version_info() {
        let db_ptr = Shell::with(|s| s.db.clone());
        let db = match db_ptr {
            Some(ref db) => db.read().unwrap(),
            _ => return,
        };

        let version = db.get_version().await.unwrap();
        let db_features = db.get_feature_flags().await.unwrap();

        Shell::with(|s| {
            s.write(vt100::CLEAR_SCREEN);
            s.write(vt100::CURSOR_HOME);

            s.write(&format!(
                "{bold}DuckDB Web Shell{normal}{endl}",
                bold = vt100::MODE_BOLD,
                normal = vt100::MODES_OFF,
                endl = vt100::CRLF
            ));

            s.write(&format!(
                "Database: {bold}{version}{normal}{endl}Package:  {bold}{package_name}@{package_version}{normal}{endl}{endl}",
                version = version,
                package_name = PACKAGE_NAME.as_str(),
                package_version = PACKAGE_VERSION.as_str(),
                bold = vt100::MODE_BOLD,
                normal = vt100::MODES_OFF,
                endl = vt100::CRLF
            ));

            if (db_features & 0b01) == 0 {
                s.write(&format!(
                    "{fg}{bg}{bold} ! {normal} DuckDB is not running at full speed.{endl}    Enter {bold}.features{normal} for details.{normal}{endl}{endl}",
                    fg = vt100::COLOR_FG_BLACK,
                    bg = vt100::COLOR_BG_BRIGHT_WHITE,
                    bold = vt100::MODE_BOLD,
                    normal = vt100::MODES_OFF,
                    endl = vt100::CRLF
                ))
            }
        });
    }

    fn write_connection_ready(&self) {
        self.write(&format!("Connected to a {bold}{mode} database{normal}{url}.{endl}Enter {bold}.help{normal} for usage hints.{endl}{endl}",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
            endl = vt100::CRLF,
            mode = match &self.db_access {
                DatabaseType::InMemory => "local transient in-memory",
                DatabaseType::RemoteReadOnly => "read-only remote"
            },
            url = match self.db_path.as_str() {
                "" | ":memory:" => "".to_string(),
                path => format!(" at: {}", path),
            }
        ));
    }

    /// Write the prompt
    pub fn prompt(&mut self) {
        self.input.start_new();
        self.input.flush(&self.terminal);
        self.input_enabled = true;
    }

    /// Focus on the terminal
    pub fn focus(&self) {
        self.terminal.focus();
    }

    // Borrow shell immutable
    pub fn with<F, R>(f: F) -> R
    where
        F: FnOnce(&Shell) -> R,
    {
        SHELL.with(|s| f(&s.borrow()))
    }

    // Borrow shell mutable
    pub fn with_mut<F, R>(f: F) -> R
    where
        F: FnOnce(&mut Shell) -> R,
    {
        SHELL.with(|s| f(&mut s.borrow_mut()))
    }
}
