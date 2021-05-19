import axios from 'axios';

import test_csv from '../../../data/uni/out/studenten.parquet';

export enum ExampleID {
    TEST_CSV,
}

export async function loadExample(id: ExampleID): Promise<File> {
    switch (id) {
        case ExampleID.TEST_CSV: {
            const res = await axios.get(test_csv, { responseType: 'blob' });
            console.log(test_csv);
            console.log(res);
            return new File([res.data], 'studenten.parquet');
        }
    }
}
