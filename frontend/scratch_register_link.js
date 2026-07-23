const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/app/(partner)/partner/register/page.tsx', 'utf8');

// Add import Link
if (!content.includes('import Link')) {
  content = content.replace(
    /import \{ useRouter \} from "next\/navigation";/,
    `import { useRouter } from "next/navigation";\nimport Link from "next/link";`
  );
}

// Add the login link at the bottom of the container div
content = content.replace(
  /\{message\}\s*<\/div>\s*\)\}\s*<\/div>/,
  `{message}
        </div>
      )}

      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/partner/login" className="text-[#FE5300] hover:underline font-semibold">
          Login here
        </Link>
      </div>
    </div>`
);

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/app/(partner)/partner/register/page.tsx', content);
