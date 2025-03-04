import React from "react";
import { Code } from "@/components/ui/code";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const typescript = `
// A simple TypeScript function
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

interface User {
  id: number;
  name: string;
  email?: string;
}

// Using the interface
const user: User = {
  id: 1,
  name: "John Doe"
};

console.log(greet(user.name));
`;

const javascript = `
// A simple JavaScript function
function calculateTotal(items) {
  return items
    .map(item => item.price * item.quantity)
    .reduce((total, current) => total + current, 0);
}

// Sample data
const cart = [
  { name: 'Product 1', price: 10, quantity: 2 },
  { name: 'Product 2', price: 15, quantity: 1 },
  { name: 'Product 3', price: 20, quantity: 3 }
];

const total = calculateTotal(cart);
console.log(\`Total: $\${total}\`);
`;

const css = `
/* Modern CSS with variables */
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --text-color: #2c3e50;
  --spacing: 1rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing);
}

.card {
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
}
`;

const samples = {
  typescript,
  javascript,
  css
};

export function CodeDemo() {
  const [language, setLanguage] = React.useState<keyof typeof samples>("typescript");
  const [showLineNumbers, setShowLineNumbers] = React.useState(true);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Syntax Highlighting Demo</CardTitle>
        <CardDescription>
          Showcase of the Code component with syntax highlighting capabilities
        </CardDescription>
        <div className="flex items-center gap-6 pt-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="language">Language:</Label>
            <Select
              value={language}
              onValueChange={(value) => setLanguage(value as keyof typeof samples)}
            >
              <SelectTrigger id="language" className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="css">CSS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="line-numbers">Show Line Numbers:</Label>
            <Switch
              id="line-numbers"
              checked={showLineNumbers}
              onCheckedChange={setShowLineNumbers}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Code
          language={language}
          code={samples[language]}
          showLineNumbers={showLineNumbers}
        />
      </CardContent>
    </Card>
  );
} 