import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { TagFilterItem } from '@/types/blog';

interface TagSectionProps {
  tags: TagFilterItem[];
  selectedTag?: string;
}

export function TagSection({ tags, selectedTag }: TagSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>태그 목록</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {tags.map((tag) => {
            const isSelected =
              tag.name === '전체' ? !selectedTag || selectedTag === '전체' : selectedTag === tag.name;

            const href = tag.name === '전체' ? '/' : `/?tag=${encodeURIComponent(tag.name)}`;

            return (
              <Link href={href} key={tag.id}>
                <div
                  className={`flex items-center justify-between rounded-md p-1.5 text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted-foreground/10'
                  }`}
                >
                  <span>{tag.name}</span>
                  <span>{tag.count}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
