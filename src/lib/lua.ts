export interface LuaGroupRef {
  readonly __luaGroup: string;
}

export type LuaObject = { [key: string]: LuaValue };

export type LuaValue =
  | string
  | number
  | boolean
  | null
  | LuaGroupRef
  | LuaValue[]
  | LuaObject;

export interface EffectFilter {
  group?: string;
  type?: string;
  name?: string;
  nameBan?: string;
  cost?: {
    min?: number;
    max?: number;
    even?: boolean;
    equal?: number;
    gold?: number;
  };
}

export type EffectKind = 'create' | 'transform' | 'add' | 'other';

export interface CardEffect {
  name: string;
  kind: EffectKind;
  targets: string[];
  amount?: number;
  hand?: boolean;
  random?: boolean;
  copy?: boolean;
  keep?: number;
  target?: string;
  filter?: EffectFilter;
}

export interface ParsedEffectSet {
  effectsByName: Map<string, CardEffect[]>;
  errors: string[];
}

interface Token {
  type: 'string' | 'number' | 'identifier' | 'symbol' | 'eof';
  value: string;
  pos: number;
}

const SYMBOLS = new Set(['{', '}', '[', ']', '=', ',', ';']);

function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const c = source[i];

    if (/\s/.test(c)) {
      i += 1;
      continue;
    }

    if (c === '-' && source[i + 1] === '-') {
      i += 2;
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c;
      const start = i;
      i += 1;
      let value = '';

      while (i < source.length) {
        const ch = source[i];
        if (ch === quote) {
          i += 1;
          tokens.push({ type: 'string', value, pos: start });
          break;
        }
        if (ch === '\\') {
          const escaped = source[i + 1];
          i += 2;
          switch (escaped) {
            case 'n':
              value += '\n';
              break;
            case 'r':
              value += '\r';
              break;
            case 't':
              value += '\t';
              break;
            case '0':
              value += '\0';
              break;
            case '\\':
              value += '\\';
              break;
            case '"':
              value += '"';
              break;
            case "'":
              value += "'";
              break;
            default:
              value += escaped ?? '';
          }
          continue;
        }
        value += ch;
        i += 1;
      }

      if (i > source.length || source[i - 1] !== quote) {
        throw new Error(`Unterminated string at position ${start}`);
      }
      continue;
    }

    const numberMatch = /^-?\d+(?:\.\d+)?/.exec(source.slice(i));
    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0], pos: i });
      i += numberMatch[0].length;
      continue;
    }

    const identifierMatch = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(source.slice(i));
    if (identifierMatch) {
      tokens.push({ type: 'identifier', value: identifierMatch[0], pos: i });
      i += identifierMatch[0].length;
      continue;
    }

    if (SYMBOLS.has(c)) {
      tokens.push({ type: 'symbol', value: c, pos: i });
      i += 1;
      continue;
    }

    throw new Error(`Unexpected character "${c}" at position ${i}`);
  }

  tokens.push({ type: 'eof', value: '', pos: source.length });
  return tokens;
}

class Parser {
  private readonly tokens: Token[];
  private index = 0;

  constructor(source: string) {
    this.tokens = lex(source);
  }

  parseRoot(): LuaValue {
    const value = this.parseValue();
    if (this.peek().type !== 'eof') {
      throw new Error(`Unexpected token "${this.peek().value}" at position ${this.peek().pos}`);
    }
    return value;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)];
  }

  private next(): Token {
    const token = this.peek();
    this.index += 1;
    return token;
  }

  private check(value: string): boolean {
    const token = this.peek();
    return (token.type === 'symbol' || token.type === 'identifier') && token.value === value;
  }

  private expect(value: string): Token {
    if (!this.check(value)) {
      const token = this.peek();
      throw new Error(`Expected "${value}" but found "${token.value}" at position ${token.pos}`);
    }
    return this.next();
  }

  private parseValue(): LuaValue {
    const token = this.peek();

    if (token.type === 'symbol' && token.value === '{') {
      return this.parseTable();
    }

    if (token.type === 'string') {
      this.next();
      return token.value;
    }

    if (token.type === 'number') {
      this.next();
      return Number(token.value);
    }

    if (token.type === 'identifier') {
      this.next();
      if (token.value === 'true') return true;
      if (token.value === 'false') return false;
      if (token.value === 'nil') return null;
      if (token.value.startsWith('cardGroup.')) {
        return { __luaGroup: token.value.slice('cardGroup.'.length) };
      }
      return token.value;
    }

    throw new Error(`Unexpected token "${token.value}" at position ${token.pos}`);
  }

  private parseTable(): LuaValue[] | LuaObject {
    this.expect('{');
    const items: LuaValue[] = [];
    const named: LuaObject = {};
    let hasNamed = false;

    while (!this.check('}')) {
      if (this.check('[')) {
        this.next();
        const rawKey = this.parseValue();
        this.expect(']');
        this.expect('=');
        const key = String(rawKey);
        named[key] = this.parseValue();
        hasNamed = true;
      } else if (this.peek().type === 'identifier' && this.peek(1).value === '=') {
        const key = this.next().value;
        this.expect('=');
        named[key] = this.parseValue();
        hasNamed = true;
      } else {
        items.push(this.parseValue());
      }

      if (this.check(',') || this.check(';')) {
        this.next();
      } else {
        break;
      }
    }

    this.expect('}');

    if (!hasNamed) return items;

    if (items.length > 0) {
      items.forEach((item, index) => {
        named[String(index + 1)] = item;
      });
    }

    return named;
  }
}

export function isLuaObject(value: LuaValue | undefined): value is LuaObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !isGroupRef(value);
}

export function isGroupRef(value: LuaValue | undefined): value is LuaGroupRef {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    '__luaGroup' in value
  );
}

function asObject(value: LuaValue | undefined): LuaObject | undefined {
  return isLuaObject(value) ? value : undefined;
}

function asString(value: LuaValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: LuaValue | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: LuaValue | undefined): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function resolveCardNames(
  value: LuaValue | undefined,
  groups: Record<string, string[]>,
): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') return [value];
  if (isGroupRef(value)) return groups[value.__luaGroup] ?? [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => resolveCardNames(item, groups));
  }
  return [];
}

export function splitTopLevelObjects(source: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let quote: string | null = null;
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(source.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return objects;
}

export function parseGroups(source: string): Record<string, string[]> {
  if (!source.trim()) return {};

  const parsed = new Parser(`{${source}}`).parseRoot();
  if (!isLuaObject(parsed)) return {};

  const groups: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (Array.isArray(value)) {
      groups[key] = value.filter((item): item is string => typeof item === 'string');
    }
  }
  return groups;
}

function parseFilter(value: LuaValue | undefined): EffectFilter | undefined {
  const filter = asObject(value);
  if (!filter) return undefined;

  const result: EffectFilter = {
    group: asString(filter.group),
    type: asString(filter.type),
    name: asString(filter.name),
    nameBan: asString(filter.nameBan),
  };

  const cost = asObject(filter.cost);
  if (cost) {
    result.cost = {
      min: asNumber(cost.min),
      max: asNumber(cost.max),
      even: asBoolean(cost.even),
      equal: asNumber(cost.equal),
      gold: asNumber(cost.gold),
    };
  }

  return result;
}

function extractEffects(
  effectsValue: LuaValue | undefined,
  groups: Record<string, string[]>,
): CardEffect[] {
  if (!Array.isArray(effectsValue)) return [];

  const effects: CardEffect[] = [];

  for (const entry of effectsValue) {
    const entryObject = asObject(entry);
    if (!entryObject) continue;

    const name = asString(entryObject.name) ?? 'Unnamed effect';
    const effect = asObject(entryObject.effect);
    if (!effect) {
      effects.push({ name, kind: 'other', targets: [] });
      continue;
    }

    if (isLuaObject(effect.create)) {
      const create = effect.create;
      effects.push({
        name,
        kind: 'create',
        targets: resolveCardNames(create.cards, groups),
        amount: asNumber(create.amount),
        hand: asBoolean(create.hand),
        random: asBoolean(create.random),
        copy: asBoolean(create.copy),
        keep: asNumber(create.keep),
      });
      continue;
    }

    if (isLuaObject(effect.transform)) {
      const transform = effect.transform;
      effects.push({
        name,
        kind: 'transform',
        targets: resolveCardNames(transform.to, groups),
        amount: asNumber(transform.amount) ?? 1,
        target: asString(transform.target),
      });
      continue;
    }

    if (isLuaObject(effect.add)) {
      const add = effect.add;
      effects.push({
        name,
        kind: 'add',
        targets: [],
        amount: asNumber(add.amount),
        filter: parseFilter(add.filter),
      });
      continue;
    }

    effects.push({ name, kind: 'other', targets: [] });
  }

  return effects;
}

export function parseCardEffects(
  source: string,
  groups: Record<string, string[]>,
): ParsedEffectSet {
  const effectsByName = new Map<string, CardEffect[]>();
  const errors: string[] = [];

  if (!source.trim()) return { effectsByName, errors };

  const chunks = splitTopLevelObjects(source);
  for (const chunk of chunks) {
    try {
      const parsed = new Parser(chunk).parseRoot();
      const card = asObject(parsed);
      if (!card) continue;

      const name = asString(card.name);
      if (!name) continue;

      const effects = extractEffects(card.effects, groups);
      if (effects.length === 0) continue;

      const existing = effectsByName.get(name) ?? [];
      const seen = new Set(
        existing.map((effect) => `${effect.name}|${effect.kind}|${effect.targets.join(',')}`),
      );

      for (const effect of effects) {
        const key = `${effect.name}|${effect.kind}|${effect.targets.join(',')}`;
        if (!seen.has(key)) {
          existing.push(effect);
          seen.add(key);
        }
      }

      effectsByName.set(name, existing);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return { effectsByName, errors };
}
