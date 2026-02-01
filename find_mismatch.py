
import re

def find_mismatches(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Simple regex for tags
    tags = re.findall(r'<(/?(?:div|button|table|thead|tbody|tr|th|td|span|h1|h2|h3|p|label|select|SignaturePad|ReactQuill))', content)

    stack = []
    for tag in tags:
        if tag.startswith('/'):
            name = tag[1:]
            if not stack:
                print(f"Excess closing tag: </{name}>")
            else:
                last_tag = stack.pop()
                if last_tag != name:
                    print(f"Mismatch: <{last_tag}> closed by </{name}>")
        else:
            # Check for self-closing if we wanted, but let's stick to simple ones first
            # SignaturePad and ReactQuill are usually self-closing if they don't have children
            # But in the code I saw, they are used as <SignaturePad /> (self closing) or <SignaturePad> ... </SignaturePad>
            # Let's check for self-closing pattern in content
            pass
            stack.append(tag)

    if stack:
        print(f"Unclosed tags: {stack}")

if __name__ == "__main__":
    import sys
    find_mismatches(sys.argv[1])
