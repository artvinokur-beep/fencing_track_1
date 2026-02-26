export type ParsedRosterRow = {
  name: string;
  club: string;
  rating: string;
  birth_year: string;
};

function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((x) => x.trim());
  if (line.includes('|')) return line.split('|').map((x) => x.trim());
  return line.split(',').map((x) => x.trim());
}

export function parseRosterInput(input: string): ParsedRosterRow[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => splitLine(line))
    .map((parts) => {
      const [name = '', club = '', rating = '', birthYear = ''] = parts;
      return {
        name,
        club,
        rating,
        birth_year: birthYear,
      };
    })
    .filter((row) => row.name.length > 0);
}
