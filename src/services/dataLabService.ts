import { DataDataset, DataColumnInfo } from '../types';

const STORAGE_KEY_DATASETS = 'forgex_datalab_datasets';

export const dataLabService = {
  getDatasets(): DataDataset[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DATASETS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {
      // fallback
    }
    return [this.getSampleDataset()];
  },

  saveDatasets(datasets: DataDataset[]): void {
    localStorage.setItem(STORAGE_KEY_DATASETS, JSON.stringify(datasets));
  },

  addDataset(dataset: DataDataset): void {
    const list = this.getDatasets();
    list.unshift(dataset);
    this.saveDatasets(list);
  },

  deleteDataset(id: string): DataDataset[] {
    const list = this.getDatasets().filter((d) => d.id !== id);
    this.saveDatasets(list);
    return list;
  },

  parseCSV(csvText: string, fileName: string = 'data.csv'): DataDataset {
    const clean = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const lines = clean.split('\n').filter((l) => l.trim().length > 0);

    if (lines.length === 0) {
      throw new Error('CSV file is empty.');
    }

    // Parse CSV line with quotes support
    const parseLine = (line: string): string[] => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ''));
      return values;
    };

    const headerRow = parseLine(lines[0]);
    const rawRows = lines.slice(1).map((l) => parseLine(l));

    const records: Record<string, any>[] = [];
    rawRows.forEach((rowVals) => {
      const rowObj: Record<string, any> = {};
      headerRow.forEach((colName, idx) => {
        const val = rowVals[idx] !== undefined ? rowVals[idx] : '';
        const numVal = Number(val);
        rowObj[colName] = !isNaN(numVal) && val.trim() !== '' ? numVal : val;
      });
      records.push(rowObj);
    });

    // Compute column statistics
    const columns: DataColumnInfo[] = headerRow.map((colName) => {
      const values = records.map((r) => r[colName]);
      const nonNulls = values.filter((v) => v !== '' && v !== null && v !== undefined);
      const numericVals = nonNulls.filter((v): v is number => typeof v === 'number');
      const isNumeric = numericVals.length > nonNulls.length * 0.7 && numericVals.length > 0;

      let min: number | undefined = undefined;
      let max: number | undefined = undefined;
      let mean: number | undefined = undefined;
      let median: number | undefined = undefined;

      if (isNumeric && numericVals.length > 0) {
        numericVals.sort((a, b) => a - b);
        min = numericVals[0];
        max = numericVals[numericVals.length - 1];
        const sum = numericVals.reduce((acc, curr) => acc + curr, 0);
        mean = Math.round((sum / numericVals.length) * 100) / 100;
        const mid = Math.floor(numericVals.length / 2);
        median = numericVals.length % 2 !== 0 ? numericVals[mid] : (numericVals[mid - 1] + numericVals[mid]) / 2;
      }

      const uniqueSet = new Set(values.map(String));

      return {
        name: colName,
        type: isNumeric ? 'numeric' : 'string',
        nonNullCount: nonNulls.length,
        nullCount: values.length - nonNulls.length,
        uniqueCount: uniqueSet.size,
        min,
        max,
        mean,
        median,
      };
    });

    return {
      id: 'dataset-' + Date.now(),
      fileName,
      rowCount: records.length,
      columnCount: headerRow.length,
      columns,
      rows: records,
      uploadTime: Date.now(),
      summary: `Uploaded ${fileName} with ${records.length} records across ${headerRow.length} attributes.`,
    };
  },

  async queryDataset(dataset: DataDataset, query?: string): Promise<string> {
    const storedApiKey = localStorage.getItem('forgex_api_key') || '';

    const res = await fetch('/api/data-lab', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
      },
      body: JSON.stringify({
        dataset,
        query,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Data Lab analysis failed.');
    }

    const data = await res.json();
    return data.analysis || 'Analysis complete.';
  },

  getSampleDataset(): DataDataset {
    const csv = `Month,Product,Revenue,UnitsSold,CustomerSatisfaction,AdSpend
Jan,AI Studio Pro,45200,320,4.8,12000
Feb,AI Studio Pro,52400,375,4.9,14500
Mar,AI Studio Pro,61800,430,4.7,16200
Apr,Data Lab Suite,38500,290,4.6,9800
May,Data Lab Suite,44100,340,4.8,11500
Jun,Neural Voice,78900,560,4.9,19000
Jul,Neural Voice,84300,610,4.9,21500
Aug,AI Studio Pro,92100,670,4.8,24000
Sep,Code Studio,68400,490,4.7,17500
Oct,Code Studio,74200,530,4.8,18800`;
    return this.parseCSV(csv, 'ForgeX_Product_Performance.csv');
  },
};
