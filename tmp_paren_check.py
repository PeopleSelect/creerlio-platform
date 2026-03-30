import io
src = open('frontend/app/dashboard/talent/page.tsx', encoding='utf8').read()
stop = 214357
state = 'normal'
stack = []
i = 0
while i < stop:
    c = src[i]
    n = src[i+1] if i + 1 < stop else ''
    if state == 'normal':
        if c == '/' and n == '*':
            state = 'block'
            i += 1
        elif c == '/' and n == '/':
            state = 'line'
            i += 1
        elif c == '"':
            state = 'd'
        elif c == "'":
            state = 's'
        elif c == '`':
            state = 't'
        elif c == '(':
            stack.append(i)
        elif c == ')':
            if stack:
                stack.pop()
    elif state == 'line':
        if c == '\n':
            state = 'normal'
    elif state == 'block':
        if c == '*' and n == '/':
            state = 'normal'
            i += 1
    elif state == 'd':
        if c == '\\':
            i += 1
        elif c == '"':
            state = 'normal'
    elif state == 's':
        if c == '\\':
            i += 1
        elif c == "'":
            state = 'normal'
    elif state == 't':
        if c == '\\':
            i += 1
        elif c == '`':
            state = 'normal'
    i += 1

if stack:
    last = stack[-1]
    pre = src[:last]
    line = pre.count('\n') + 1
    col = last - pre.rfind('\n')
    print('Unmatched ( at', last, 'line', line, 'col', col)
else:
    print('No unmatched (')
