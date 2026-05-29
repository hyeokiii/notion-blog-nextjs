import type { GetPublishedPostsParams, Post, TagFilterItem } from '@/types/blog';
import { Client, isFullDatabase, isFullUser, PageObjectResponse } from '@notionhq/client';

import { NotionToMarkdown } from 'notion-to-md';

const notion = new Client({ auth: process.env.NOTION_TOKEN, notionVersion: '2026-03-11' });
const n2m = new NotionToMarkdown({ notionClient: notion });

const getDataSourceId = async (): Promise<string> => {
  const database = await notion.databases.retrieve({
    database_id: process.env.NOTION_DATABASE_ID!,
  });

  if (!isFullDatabase(database)) {
    throw new Error('Notion database response is incomplete');
  }

  const firstDataSource = database.data_sources[0];
  if (!firstDataSource) {
    throw new Error('Notion database has no data sources');
  }

  return firstDataSource.id;
};

const getAuthorName = (
  authorProperty: Extract<PageObjectResponse['properties'][string], { type: 'people' }>
): string => {
  const first = authorProperty.people[0];
  if (!first) return '';

  if (first.object === 'group') {
    return first.name ?? '';
  }

  if (isFullUser(first)) {
    if (first.type === 'person') {
      return first.name ?? first.person.email ?? '';
    }
    return first.name ?? '';
  }

  return '';
};

export const getPublishedPosts = async (params?: GetPublishedPostsParams) => {
  const dataSourceId = await getDataSourceId();
  const tag = params?.tag || '전체';
  const sort = params?.sort || 'latest';
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    in_trash: false,
    filter: {
      and: [
        {
          property: 'Status',
          select: {
            equals: 'Published',
          },
        },
        ...(tag && tag !== '전체'
          ? [
              {
                property: 'Tags',
                multi_select: {
                  contains: tag,
                },
              },
            ]
          : []),
      ],
    },
    sorts: [
      {
        property: 'Date',
        direction: sort === 'latest' ? 'descending' : 'ascending',
      },
    ],
    page_size: params?.page_size,
    start_cursor: params?.start_cursor,
  });

  const posts = response.results
    .filter((page): page is PageObjectResponse => 'properties' in page)
    .map(getPostMetadata);
  return { posts, hasMore: response.has_more, next_cursor: response.next_cursor };
};

function getPostMetadata(page: PageObjectResponse): Post {
  const { properties } = page;

  const getCoverImage = (cover: PageObjectResponse['cover']) => {
    if (!cover) return '';

    switch (cover.type) {
      case 'external':
        return cover.external.url;
      case 'file':
        return cover.file.url;
      default:
        return '';
    }
  };

  return {
    id: page.id,
    title: properties.Title.type === 'title' ? (properties.Title.title[0]?.plain_text ?? '') : '',
    description:
      properties.Description.type === 'rich_text'
        ? (properties.Description.rich_text[0]?.plain_text ?? '')
        : '',
    coverImage: getCoverImage(page.cover),
    tags:
      properties.Tags.type === 'multi_select'
        ? properties.Tags.multi_select.map((tag) => tag.name)
        : [],
    author: properties.Author.type === 'people' ? getAuthorName(properties.Author) : '',
    date: properties.Date.type === 'date' ? (properties.Date.date?.start ?? '') : '',
    modifiedDate: page.last_edited_time,
    slug:
      properties.Slug.type === 'rich_text'
        ? (properties.Slug.rich_text[0]?.plain_text ?? page.id)
        : page.id,
  };
}

export const getPostBySlug = async (
  slug: string
): Promise<{
  markdown: string;
  post: Post | null;
}> => {
  const dataSourceId = await getDataSourceId();

  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    in_trash: false,
    filter: {
      and: [
        {
          property: 'Slug',
          rich_text: { equals: slug },
        },
        {
          property: 'Status',
          select: { equals: 'Published' },
        },
      ],
    },
  });

  const page = response.results.find(
    (result): result is PageObjectResponse => 'properties' in result
  );

  if (!page) {
    return {
      markdown: '',
      post: null,
    };
  }

  const mdBlocks = await n2m.pageToMarkdown(page.id);
  const { parent } = n2m.toMarkdownString(mdBlocks);

  return {
    markdown: parent,
    post: getPostMetadata(page),
  };
};

export const getTagsFromPosts = (posts: Post[]): TagFilterItem[] => {
  const tagCount = posts.reduce<Record<string, number>>((acc, post) => {
    post.tags?.forEach((tag) => {
      acc[tag] = (acc[tag] ?? 0) + 1;
    });
    return acc;
  }, {});

  const tags: TagFilterItem[] = Object.entries(tagCount).map(([name, count]) => ({
    id: name,
    name,
    count,
  }));

  tags.unshift({
    id: 'all',
    name: '전체',
    count: posts.length,
  });

  const [allTag, ...restTags] = tags;
  const sortedTags = restTags.sort((a, b) => a.name.localeCompare(b.name));

  return [allTag, ...sortedTags];
};

export const getTags = async (): Promise<TagFilterItem[]> => {
  const { posts } = await getPublishedPosts({ page_size: 100 });
  return getTagsFromPosts(posts);
};

export interface CreatePostParams {
  title: string;
  slug: string;
  tag: string;
  content: string;
}

export const createPost = async ({ title, slug, tag, content }: CreatePostParams) => {
  const response = await notion.pages.create({
    parent: {
      database_id: process.env.NOTION_DATABASE_ID!,
    },
    properties: {
      Title: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
      Slug: {
        rich_text: [
          {
            text: {
              content: slug,
            },
          },
        ],
      },
      Description: {
        rich_text: [
          {
            text: {
              content: content,
            },
          },
        ],
      },
      Tags: {
        multi_select: [{ name: tag }],
      },
      Status: {
        select: {
          name: 'Published',
        },
      },
      Date: {
        date: {
          start: new Date().toISOString(),
        },
      },
    },
  });

  return response;
};
