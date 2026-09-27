import { PortableText } from '@portabletext/react';

const components = {
  block: {
    h2: ({children}: any) => <h2>{children}</h2>,
    h3: ({children}: any) => <h3>{children}</h3>,
    blockquote: ({children}: any) => <blockquote>{children}</blockquote>
  },
  marks: {
    link: ({children, value}: any) => <a href={value?.href} target="_blank" rel="noopener noreferrer">{children}</a>
  }
};

export default function PortableBody({ value }: { value: any[] }) {
  return <PortableText value={value || []} components={components as any} />;
}
