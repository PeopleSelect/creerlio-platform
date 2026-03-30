import sys

def scan(path: str, max_line: int | None = None) -> None:
    data = open(path, "r", encoding="utf-8").read()
    if max_line is not None:
        cut = 0
        line = 1
        while cut < len(data) and line <= max_line:
            if data[cut] == "\n":
                line += 1
            cut += 1
        data = data[:cut]
    stack = []
    state = "code"
    esc = False
    i = 0
    while i < len(data):
        ch = data[i]
        nxt = data[i + 1] if i + 1 < len(data) else ""
        if state == "line":
            if ch == "\n":
                state = "code"
            i += 1
            continue
        if state == "block":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
                continue
            i += 1
            continue
        if state in ("s", "d", "b"):
            if esc:
                esc = False
                i += 1
                continue
            if ch == "\\":
                esc = True
                i += 1
                continue
            if (state == "s" and ch == "'") or (state == "d" and ch == '"') or (state == "b" and ch == "`"):
                state = "code"
                i += 1
                continue
            i += 1
            continue
        if ch == "/" and nxt == "/":
            state = "line"
            i += 2
            continue
        if ch == "/" and nxt == "*":
            state = "block"
            i += 2
            continue
        if ch == "'":
            state = "s"
            i += 1
            continue
        if ch == '"':
            state = "d"
            i += 1
            continue
        if ch == "`":
            state = "b"
            i += 1
            continue
        if ch in "{[(":
            stack.append((ch, i))
        elif ch in "}])":
            if stack:
                stack.pop()
        i += 1

    print("stack length:", len(stack))
    if stack:
        tail = stack[-10:]
        for ch, pos in tail:
            line = data.count("\n", 0, pos) + 1
            col = pos - data.rfind("\n", 0, pos)
            print("open:", ch, "line:", line, "col:", col)

if __name__ == "__main__":
    path = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else None
    scan(path, limit)
