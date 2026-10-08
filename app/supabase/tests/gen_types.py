#!/usr/bin/env python3
"""Erzeugt src/lib/database.types.ts aus einer laufenden Postgres-Instanz (Ersatz für `supabase gen types`,
das lokal Docker bräuchte). Aufruf: python3 gen_types.py postgresql://... > ../../src/lib/database.types.ts"""
import subprocess, sys, json

dsn = sys.argv[1]

def q(sql):
    out = subprocess.run(["psql", dsn, "-At", "-F", "\t", "-c", sql], capture_output=True, text=True, check=True).stdout
    if out.strip() and "\t" not in out and "|" in out: out = out.replace("|", "\t")
    return [line.split("\t") for line in out.strip().split("\n") if line]

TYPE_MAP = {
    "uuid": "string", "text": "string", "citext": "string", "character varying": "string", "date": "string",
    "timestamp with time zone": "string", "timestamp without time zone": "string",
    "integer": "number", "bigint": "number", "smallint": "number", "numeric": "number", "double precision": "number", "real": "number",
    "boolean": "boolean", "jsonb": "Json", "json": "Json",
}

enums = {}
for name, vals in q("select t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder) from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace where n.nspname='public' group by t.typname"):
    enums[name] = vals.split(",")

def ts_type(data_type, udt_name):
    if udt_name == "citext": return "string"
    if data_type == "USER-DEFINED" and udt_name in enums:
        return f'Database["public"]["Enums"]["{udt_name}"]'
    if data_type == "ARRAY":
        return "string[]"
    return TYPE_MAP.get(data_type, "unknown")

tables = [r[0] for r in q("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1")]
views = [r[0] for r in q("select table_name from information_schema.views where table_schema='public' order by 1")]

def relationships(table):
    rows = q(f"""select c.conname, array_to_string(array(select attname from pg_attribute where attrelid=c.conrelid and attnum = any(c.conkey)), ','),
                       c.confrelid::regclass::text,
                       array_to_string(array(select attname from pg_attribute where attrelid=c.confrelid and attnum = any(c.confkey)), ','),
                       exists(select 1 from pg_constraint u where u.conrelid=c.conrelid and u.contype in ('p','u') and u.conkey = c.conkey)
                from pg_constraint c where c.contype='f' and c.conrelid = 'public.{table}'::regclass order by 1""")
    out = []
    for name, cols, ref, refcols, one in rows:
        out.append('          { foreignKeyName: "%s"; columns: [%s]; isOneToOne: %s; referencedRelation: "%s"; referencedColumns: [%s] }' % (
            name, ", ".join(json.dumps(c) for c in cols.split(",")), "true" if one == "t" else "false", ref.replace("public.",""), ", ".join(json.dumps(c) for c in refcols.split(","))))
    return out

def columns(table):
    return q(f"select column_name, data_type, udt_name, is_nullable, column_default is not null from information_schema.columns where table_schema='public' and table_name='{table}' order by ordinal_position")

out = []
out.append('// Generiert aus dem Datenbankschema (supabase/tests/gen_types.py) – nicht von Hand ändern.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]\n')
out.append("export type Database = {\n  public: {\n    Tables: {")
for t in tables:
    cols = columns(t)
    out.append(f"      {t}: {{")
    out.append("        Row: {")
    for c, dt, udt, nullable, hasdef in cols:
        typ = ts_type(dt, udt) + (" | null" if nullable == "YES" else "")
        out.append(f"          {c}: {typ}")
    out.append("        }")
    out.append("        Insert: {")
    for c, dt, udt, nullable, hasdef in cols:
        typ = ts_type(dt, udt) + (" | null" if nullable == "YES" else "")
        opt = "?" if (nullable == "YES" or hasdef == "t") else ""
        out.append(f"          {c}{opt}: {typ}")
    out.append("        }")
    out.append("        Update: {")
    for c, dt, udt, nullable, hasdef in cols:
        typ = ts_type(dt, udt) + (" | null" if nullable == "YES" else "")
        out.append(f"          {c}?: {typ}")
    out.append("        }")
    rels = relationships(t)
    if rels:
        out.append("        Relationships: [\n" + ",\n".join(rels) + "\n        ]")
    else:
        out.append("        Relationships: []")
    out.append("      }")
out.append("    }\n    Views: {")
for v in views:
    cols = columns(v)
    out.append(f"      {v}: {{\n        Row: {{")
    for c, dt, udt, nullable, hasdef in cols:
        out.append(f"          {c}: {ts_type(dt, udt)} | null")
    out.append("        }\n        Relationships: []\n      }")
out.append("    }\n    Functions: {")
funcs = q("""select p.proname, pg_get_function_arguments(p.oid), pg_get_function_result(p.oid), p.proretset
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.prokind='f' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') order by 1""")
def pg_to_ts(t):
    t = t.strip()
    if t.startswith("SETOF "): t = t[6:]
    if t.startswith("TABLE("):
        inner = t[6:-1]
        fields = []
        for part in inner.split(","):
            part = part.strip()
            name, typ = part.split(" ", 1)
            fields.append(f"{name}: {pg_to_ts(typ)}")
        return "{ " + "; ".join(fields) + " }"
    base = {"uuid": "string", "text": "string", "citext": "string", "integer": "number", "bigint": "number", "numeric": "number",
            "boolean": "boolean", "jsonb": "Json", "void": "undefined", "timestamp with time zone": "string"}
    if t in enums: return f'Database["public"]["Enums"]["{t}"]'
    return base.get(t, "unknown")
seen = set()
for name, args, ret, retset in funcs:
    if name in seen or name in ("set_updated_at", "handle_new_user", "t_assert"): continue
    seen.add(name)
    arglist = []
    for a in [x.strip() for x in args.split(",") if x.strip()]:
        parts = a.replace(" DEFAULT ", " default ").split(" default ")
        has_default = len(parts) > 1
        if " " not in parts[0]:
            arglist.append(f"arg{len(arglist)}: {pg_to_ts(parts[0])}")
            continue
        an, at = parts[0].split(" ", 1)
        arglist.append(f"{an}{'?' if has_default else ''}: {pg_to_ts(at)}")
    rt = pg_to_ts(ret)
    if retset == "t": rt += "[]"
    args_ts = "{ " + "; ".join(arglist) + " }" if arglist else "Record<string, never>"
    out.append(f"      {name}: {{\n        Args: {args_ts}\n        Returns: {rt}\n      }}")
out.append("    }\n    Enums: {")
for e, vals in enums.items():
    out.append(f"      {e}: " + " | ".join(json.dumps(v) for v in vals))
out.append("    }\n    CompositeTypes: Record<string, never>\n  }\n}\n")
out.append("""
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]
export type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"]
""")
print("\n".join(out))
