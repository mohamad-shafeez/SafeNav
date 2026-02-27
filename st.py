import os

def list_files(startpath):
    # Folders you want to ignore
    exclude = set(['node_modules', '__pycache__', '.git', '.vscode', 'venv'])
    
    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in exclude]
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        print(f'{indent}{os.path.basename(root)}/')
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            if not f.endswith('.pyc'):
                print(f'{subindent}{f}')

list_files(os.getcwd())