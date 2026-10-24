import { Terminal } from './Terminal';

const files = ['README.md', 'package.json', 'src/', 'tests/'];

function handle(line: string) {
  const [command = '', ...args] = line.split(/\s+/);
  switch (command) {
    case 'help':
      return 'Commands: help, ls, echo <text>, date, wait, fail, clear';
    case 'ls':
      return files.join('\n');
    case 'echo':
      return args.join(' ');
    case 'date':
      return new Date().toLocaleString();
    case 'wait':
      return new Promise<string>((resolve) => setTimeout(() => resolve('Finished after one second.'), 1000));
    case 'fail':
      return Promise.reject(new Error('demo failure'));
    default:
      return `Unknown command: ${command}. Type help.`;
  }
}

export const examples = [
  {
    title: 'Command console',
    description: 'Type `help`. ArrowUp/ArrowDown recall earlier commands, Escape clears the line, `clear` empties the log. Output may be text or any ReactNode, sync or async.',
    code: `<Terminal\n  welcome="Type help to list commands."\n  onCommand={(line) => (line === 'help' ? 'Commands: help, date' : line === 'date' ? new Date().toString() : \`Unknown command: \${line}\`)}\n/>`,
    render: () => <Terminal welcome="Type help to list commands." onCommand={handle} height="14rem" />,
  },
];
