import { FC } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpIcon, ArrowDownIcon, Cross2Icon, UpdateIcon, DividerHorizontalIcon } from "@radix-ui/react-icons"

export const FineTuningView: FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chapter Fine-Tuning</CardTitle>
          <CardDescription>
            Adjust chapters and rounds to optimize your story's summarization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">Chapter 1</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Index</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-full">Summary</TableHead>
                <TableHead className="w-48 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Placeholder for round data */}
              {[1, 2, 3].map((round) => (
                <TableRow key={round}>
                  <TableCell>{round}</TableCell>
                  <TableCell>
                    <Badge variant={round === 3 ? "outline" : "default"}>
                      {round === 3 ? "Pending" : "Summarized"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {round === 3 
                      ? "Waiting for summarization..." 
                      : "This is a placeholder for the round summary that will be generated during the summarization process."}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="icon" title="Slide Up">
                        <ArrowUpIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" title="Slide Down">
                        <ArrowDownIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" title="Split">
                        <DividerHorizontalIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" title="Omit">
                        <Cross2Icon className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" title="Reroll">
                        <UpdateIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button variant="outline" className="mr-2">Download Configuration</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  )
} 