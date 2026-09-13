export default function postImages() {
  return function transformer(tree, file) {
    const path = file.history?.[0] ?? '';
    const match = path.match(/src[\\/]content[\\/]posts[\\/]([^\\/]+)[\\/]index\.md$/);
    if (!match) return;
    const slug = match[1];
    const visit = (node) => {
      if (node.type === 'image' && typeof node.url === 'string' && node.url.startsWith('images/')) {
        node.url = `/posts/${slug}/${node.url}`;
      }
      if (node.children) node.children.forEach(visit);
    };
    visit(tree);
  };
}
