const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/custom/FooterItem.tsx', 'utf8');

content = content.replace(
  /\{\s*FootObj\?\.content\?\.map\(\(item: Item, idx: number\) => \(\s*<li className="hover:text-\[\#FE5300\]" key=\{idx\}>\s*<a href=\{item\.url\}>\{item\.text\}<\/a>\s*<\/li>\s*\)\)\s*\}/,
  `{FootObj?.content?.map((item: Item, idx: number) => (
          <li className="hover:text-[#FE5300]" key={idx}>
            <a href={item.url}>{item.text}</a>
          </li>
        ))}
        {title === "Services" && (
          <li className="hover:text-[#FE5300]" key="partner-portal">
            <a href="/partner/login">Partner Portal</a>
          </li>
        )}`
);

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/custom/FooterItem.tsx', content);
