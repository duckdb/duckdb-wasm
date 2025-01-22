import * as duckdb from '../src/';

export function testFTS(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;
    beforeEach(() => {
        conn = db().connect();
    });

    afterEach(() => {
        conn.close();
        db().flushFiles();
        db().dropFiles();
    });

    describe('FTS', () => {
        it('sample', async () => {
            // example from https://duckdb.org/docs/sql/full_text_search
            await conn.query(
                'CREATE TABLE documents(document_identifier VARCHAR, text_content VARCHAR, author VARCHAR, doc_version INTEGER);',
            );
            await conn.query(
                "INSERT INTO documents VALUES ('doc1', 'The mallard is a dabbling duck that breeds throughout the temperate.','Hannes Mühleisen', 3), ('doc2', 'The cat is a domestic species of small carnivorous mammal.', 'Laurens Kuiper', 2);",
            );
            // Skip for now, not supported in the no-extension version
            return;
            await conn.query("PRAGMA create_fts_index('documents', 'document_identifier', 'text_content', 'author');");
            const result = conn.query(
                'SELECT document_identifier, score\n' +
                    "            FROM (SELECT *, fts_main_documents.match_bm25(document_identifier, 'Muhleisen', fields := 'author') AS score\n" +
                    '            FROM documents) sq\n' +
                    '            WHERE score IS NOT NULL\n' +
                    '            AND doc_version > 2\n' +
                    '            ORDER BY score DESC;',
            );

            expect(result.getChildAt(0)?.toArray()).toEqual(['doc1']);
        });
    });
}
