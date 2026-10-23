import { Grid } from './Grid';

const Box = ({ children }: { children: string }) => <div className="border rounded p-3 bg-body-secondary h-100">{children}</div>;

export const examples = [
  {
    title: 'Equal columns per breakpoint',
    description: 'Mobile first: 1 column, 2 from sm, 4 from xl.',
    code: `<Grid columns={{ xs: 1, sm: 2, xl: 4 }} gap={3}>\n  <Card>1</Card> ...\n</Grid>`,
    render: () => (
      <Grid columns={{ xs: 1, sm: 2, xl: 4 }} gap={3}>
        {['One', 'Two', 'Three', 'Four'].map((n) => <Box key={n}>{n}</Box>)}
      </Grid>
    ),
  },
  {
    title: 'Explicit spans',
    code: `<Grid gap={4}>\n  <Grid.Col span={{ xs: 12, lg: 8 }}>Main</Grid.Col>\n  <Grid.Col span={{ xs: 12, lg: 4 }}>Aside</Grid.Col>\n</Grid>`,
    render: () => (
      <Grid gap={4}>
        <Grid.Col span={{ xs: 12, lg: 8 }}><Box>Main</Box></Grid.Col>
        <Grid.Col span={{ xs: 12, lg: 4 }}><Box>Aside</Box></Grid.Col>
      </Grid>
    ),
  },
];
