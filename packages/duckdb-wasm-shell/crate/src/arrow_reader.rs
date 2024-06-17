// The contents of this file were derived from the arrow IPC printer.
// https://github.com/apache/arrow-rs/blob/45acc62c1c07b1eb55512a0d42628542211996d3/arrow/src/ipc/reader.rs

// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

use arrow::array::ArrayRef;
use arrow::datatypes::SchemaRef;
use arrow::error::ArrowError;
use arrow::record_batch::RecordBatch;
use std::sync::Arc;
use std::collections::HashMap;

const CONTINUATION_MARKER: [u8; 4] = [0xff; 4];

pub struct Reader<'buf> {
    buffer: &'buf [u8],
    position: usize,
}

impl<'buf> Reader<'buf> {
    pub fn new(buffer: &'buf [u8]) -> Self {
        Self {
            buffer,
            position: 0,
        }
    }
    pub fn next4(&mut self) -> Result<[u8; 4], ArrowError> {
        let bytes = self.next(4)?;
        return Ok([bytes[0], bytes[1], bytes[2], bytes[3]]);
    }
    pub fn next(&mut self, n: usize) -> Result<&'buf [u8], ArrowError> {
        let available = self.buffer.len() - self.position;
        if available < n {
            Err(arrow::error::ArrowError::IoError(
                "insufficient bytes available".to_string(),
                std::io::Error::new(std::io::ErrorKind::Other,"")
            ))
        } else {
            let result = &self.buffer[self.position..(self.position + n)];
            self.position += n;
            Ok(result)
        }
    }
    pub fn tail(&self) -> &'buf [u8] {
        &self.buffer[self.position..]
    }
}

pub struct ArrowStreamReader {
    /// The schema that is read from the stream's first message
    schema: SchemaRef,
    /// Optional dictionaries for each schema field.
    ///
    /// Dictionaries may be appended to in the streaming format.
    dictionaries_by_field: HashMap<i64, ArrayRef>,
    /// An indicator of whether the stream is complete.
    ///
    /// This value is set to `true` the first time the reader's `next()` returns `None`.
    finished: bool,
}

impl ArrowStreamReader {
    /// Try to create a new stream reader
    ///
    /// The first message in the stream is the schema, the reader will fail if it does not
    /// encounter a schema.
    /// To check if the reader is done, use `is_finished(self)`
    pub fn try_new(buffer: &[u8]) -> Result<Self, ArrowError> {
        let mut reader = Reader::new(buffer);

        // determine metadata length
        let meta_size: [u8; 4] = reader.next4()?;
        let meta_len = {
            // If a continuation marker is encountered, skip over it and read
            // the size from the next four bytes.
            if meta_size == CONTINUATION_MARKER {
                i32::from_le_bytes(reader.next4()?)
            } else {
                i32::from_le_bytes(meta_size)
            }
        };

        let meta_buffer = reader.next(meta_len as usize)?;
        let message = arrow::ipc::root_as_message(meta_buffer).map_err(|err| {
            ArrowError::IoError(format!("Unable to get root as message: {:?}", err),std::io::Error::new(std::io::ErrorKind::Other,""))
        })?;
        // message header is a Schema, so read it
        let ipc_schema: arrow::ipc::Schema = message.header_as_schema().ok_or_else(|| {
            ArrowError::IoError("Unable to read IPC message as schema".to_string(),std::io::Error::new(std::io::ErrorKind::Other,""))
        })?;
        let schema = arrow::ipc::convert::fb_to_schema(ipc_schema);

        // Create an array of optional dictionary value arrays, one per field.
        let dictionaries_by_field = HashMap::new();

        Ok(Self {
            schema: Arc::new(schema),
            finished: false,
            dictionaries_by_field,
        })
    }

    /// Return the schema of the stream
    pub fn schema(&self) -> SchemaRef {
        self.schema.clone()
    }

    /// Check if the stream is finished
    pub fn is_finished(&self) -> bool {
        self.finished
    }

    pub fn maybe_next(&mut self, buffer: &[u8]) -> Result<Option<RecordBatch>, ArrowError> {
        if self.finished {
            return Ok(None);
        }
        let mut reader = Reader::new(buffer);

        // Helper to read from the slice
        let meta_size = match reader.next4() {
            Ok(s) => s,
            Err(_) => {
                // Handle EOF without the "0xFFFFFFFF 0x00000000"
                // valid according to:
                // https://arrow.apache.org/docs/format/Columnar.html#ipc-streaming-format
                self.finished = true;
                return Ok(None);
            }
        };
        let meta_len = {
            // If a continuation marker is encountered, skip over it and read
            // the size from the next four bytes.
            if meta_size == CONTINUATION_MARKER {
                i32::from_le_bytes(reader.next4()?)
            } else {
                i32::from_le_bytes(meta_size)
            }
        };
        if meta_len == 0 {
            // the stream has ended, mark the reader as finished
            self.finished = true;
            return Ok(None);
        }

        let meta_buffer = reader.next(meta_len as usize)?;
        let message = arrow::ipc::root_as_message(meta_buffer).map_err(|err| {
            ArrowError::IoError(format!("Unable to get root as message: {:?}", err),std::io::Error::new(std::io::ErrorKind::Other,""))
        })?;

        match message.header_type() {
            arrow::ipc::MessageHeader::Schema => Err(ArrowError::IoError(
                "Not expecting a schema when messages are read".to_string(),
            std::io::Error::new(std::io::ErrorKind::Other,""))),
            arrow::ipc::MessageHeader::RecordBatch => {
                let batch = message.header_as_record_batch().ok_or_else(|| {
                    ArrowError::IoError("Unable to read IPC message as record batch".to_string(),std::io::Error::new(std::io::ErrorKind::Other,""))
                })?;
                let metadata = arrow::ipc::gen::Schema::MetadataVersion(1);
                let buf = reader.next(message.bodyLength() as usize)?;
                let buf1 = arrow::buffer::Buffer::from_slice_ref(buf);
                arrow::ipc::reader::read_record_batch(
                    &buf1,
                    batch,
                    self.schema(),
                    &self.dictionaries_by_field,
                    None,
                    &metadata
                )
                .map(Some)
            }
            arrow::ipc::MessageHeader::DictionaryBatch => {
                let batch = message.header_as_dictionary_batch().ok_or_else(|| {
                    ArrowError::IoError(
                        "Unable to read IPC message as dictionary batch".to_string(),std::io::Error::new(std::io::ErrorKind::Other,"")
                    )
                })?;
                let buf = reader.next(message.bodyLength() as usize)?;
                let buf1 = arrow::buffer::Buffer::from_slice_ref(buf);
                let metadata = arrow::ipc::gen::Schema::MetadataVersion(1);
                arrow::ipc::reader::read_dictionary(
                    &buf1,
                    batch,
                    &self.schema,
                    &mut self.dictionaries_by_field,
		    &metadata
                )?;

                // read the next message until we encounter a RecordBatch
                self.maybe_next(reader.tail())
            }
            arrow::ipc::MessageHeader::NONE => Ok(None),
            t => Err(ArrowError::IoError(format!(
                "Reading types other than record batches not yet supported, unable to read {:?} ",
                t
            ), std::io::Error::new(std::io::ErrorKind::Other,""))),
        }
    }
}
