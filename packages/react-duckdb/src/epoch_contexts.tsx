import React from 'react';

export const TABLE_SCHEMA_EPOCH = React.createContext<number | null>(null);
export const useTableSchemaEpoch = (): number | null => React.useContext(TABLE_SCHEMA_EPOCH);

export const TABLE_DATA_EPOCH = React.createContext<number | null>(null);
export const useTableDataEpoch = (): number | null => React.useContext(TABLE_DATA_EPOCH);
