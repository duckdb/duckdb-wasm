import { editor } from 'monaco-editor';

export const theme: editor.IStandaloneThemeData = {
    base: 'vs',
    inherit: true,
    rules: [
        {
            token: 'string',
            foreground: 'c41a16',
        },
        {
            token: 'literal',
            foreground: '1c00cf',
        },
        {
            token: 'keyword',
            foreground: '4682b4',
            fontStyle: 'bold',
        },
        {
            token: 'keyword.operator',
            foreground: '000000',
        },
        {
            token: 'identifier',
            foreground: '000000',
        },
        {
            token: 'option.key',
            fontStyle: 'italic',
        },
        {
            token: 'comment',
            foreground: '007400',
        },
    ],
    colors: {
        'editor.foreground': '#000000',
        'editor.background': '#FFFFFF',
        'editor.selectionBackground': '#F0F0F0',
        'editor.lineHighlightBackground': '#F0F0F0',
        'editorCursor.foreground': '#000000',
        'editorWhitespace.foreground': '#B3B3B3F4',
    },
};
export default theme;
