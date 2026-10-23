import { Stack } from './Stack';

const Box = ({ children }: { children: string }) => <div className="border rounded p-2 bg-body-secondary">{children}</div>;

export const examples = [
  {
    title: 'Vertical and horizontal',
    description: 'One-dimensional layout with spacing tokens.',
    code: `<Stack gap={2}>\n  <Box>One</Box>\n  <Box>Two</Box>\n</Stack>\n<Stack direction="horizontal" gap={4} justify="end">\n  <Box>Cancel</Box>\n  <Box>Save</Box>\n</Stack>`,
    render: () => (
      <Stack gap={4}>
        <Stack gap={2}>
          <Box>One</Box>
          <Box>Two</Box>
        </Stack>
        <Stack direction="horizontal" gap={4} justify="end">
          <Box>Cancel</Box>
          <Box>Save</Box>
        </Stack>
      </Stack>
    ),
  },
  {
    title: 'Responsive direction with dividers',
    code: `<Stack direction={{ xs: 'vertical', md: 'horizontal' }} divider gap={6}>...</Stack>`,
    render: () => (
      <Stack direction={{ xs: 'vertical', md: 'horizontal' }} divider gap={6} align="center">
        <Box>Alpha</Box>
        <Box>Beta</Box>
        <Box>Gamma</Box>
      </Stack>
    ),
  },
];
