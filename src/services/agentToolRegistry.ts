/**
 * Agent Lab Tool Registry
 * Definitions, parameter schemas, and permissions gating for real tool-using agents.
 */

export interface ToolDefinition {
  name: string;
  category: 'web' | 'browser' | 'files' | 'email' | 'code' | 'computer';
  label: string;
  description: string;
  permissionKey: 'browser' | 'webSearch' | 'files' | 'email' | 'computerControl' | 'codeExecution';
  isSensitive: boolean; // Requires user confirmation before execution
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: any;
    }>;
    required?: string[];
  };
}

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  // 1. Web Search
  web_search: {
    name: 'web_search',
    category: 'web',
    label: 'Live Web Search',
    description: 'Searches the live internet for verified real-time information, news, sources, and factual grounding.',
    permissionKey: 'webSearch',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords or question to look up online.' },
      },
      required: ['query'],
    },
  },

  // 2. Browser Automation Tools
  browser_open: {
    name: 'browser_open',
    category: 'browser',
    label: 'Open Browser on Laptop',
    description: 'Launches a webpage URL directly in a browser window or tab on the user\'s laptop and retrieves page title and initial content.',
    permissionKey: 'browser',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL starting with http:// or https:// to open on the user\'s laptop' },
      },
      required: ['url'],
    },
  },

  browser_read: {
    name: 'browser_read',
    category: 'browser',
    label: 'Read Webpage Content',
    description: 'Extracts clean textual content, headings, and links from an opened webpage or URL.',
    permissionKey: 'browser',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The webpage URL to read and parse.' },
        section: { type: 'string', description: 'Optional specific section or topic to extract.' },
      },
      required: ['url'],
    },
  },

  browser_search: {
    name: 'browser_search',
    category: 'browser',
    label: 'Browser Search Engine',
    description: 'Uses a web browser search engine to find links, read snippets, and select top results.',
    permissionKey: 'browser',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms to query in the browser.' },
      },
      required: ['query'],
    },
  },

  browser_click: {
    name: 'browser_click',
    category: 'browser',
    label: 'Click Web Element / Link',
    description: 'Simulates clicking a button, link, or tab on a webpage and follows navigation.',
    permissionKey: 'browser',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Text or selector of the element/link to click.' },
        currentUrl: { type: 'string', description: 'Current URL context.' },
      },
      required: ['target'],
    },
  },

  browser_type: {
    name: 'browser_type',
    category: 'browser',
    label: 'Type in Web Form',
    description: 'Types text into a search box, input field, or form on a webpage and submits.',
    permissionKey: 'browser',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        field: { type: 'string', description: 'Field name or description (e.g. "search", "query").' },
        text: { type: 'string', description: 'Text to type into the field.' },
        url: { type: 'string', description: 'Target webpage URL.' },
      },
      required: ['field', 'text'],
    },
  },

  browser_scroll: {
    name: 'browser_scroll',
    category: 'browser',
    label: 'Scroll Webpage',
    description: 'Scrolls up or down on a webpage to read additional dynamic content.',
    permissionKey: 'browser',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        direction: { type: 'string', description: 'Scroll direction', enum: ['down', 'up'] },
        url: { type: 'string', description: 'Webpage URL context.' },
      },
      required: ['direction'],
    },
  },

  // 3. File Management Tools
  file_list: {
    name: 'file_list',
    category: 'files',
    label: 'List Files & Folders',
    description: 'Lists all files, subdirectories, sizes, and file extensions in a sandboxed folder (e.g. /Downloads, /Documents, /Desktop, /).',
    permissionKey: 'files',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        folderPath: { type: 'string', description: 'Path to folder (e.g. "/Downloads", "/Documents", or "/"). Defaults to "/Downloads".' },
      },
    },
  },

  file_read: {
    name: 'file_read',
    category: 'files',
    label: 'Read File Content',
    description: 'Reads text, markdown, csv, or code file contents from the sandboxed filesystem.',
    permissionKey: 'files',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file (e.g. "/Downloads/report.pdf", "/Documents/notes.txt").' },
      },
      required: ['filePath'],
    },
  },

  file_create: {
    name: 'file_create',
    category: 'files',
    label: 'Create File',
    description: 'Creates a new file with specified content in the sandboxed filesystem.',
    permissionKey: 'files',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path for the new file (e.g. "/Documents/summary.md").' },
        content: { type: 'string', description: 'Content to write into the file.' },
      },
      required: ['filePath', 'content'],
    },
  },

  folder_create: {
    name: 'folder_create',
    category: 'files',
    label: 'Create Folder',
    description: 'Creates a new directory in the sandboxed filesystem (e.g. "/Downloads/Images", "/Documents/Projects").',
    permissionKey: 'files',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        folderPath: { type: 'string', description: 'Path for new directory (e.g. "/Downloads/Images").' },
      },
      required: ['folderPath'],
    },
  },

  file_move: {
    name: 'file_move',
    category: 'files',
    label: 'Move File',
    description: 'Moves a file from one folder to another in the sandboxed filesystem.',
    permissionKey: 'files',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        sourcePath: { type: 'string', description: 'Source file path.' },
        destinationPath: { type: 'string', description: 'Destination folder or file path.' },
      },
      required: ['sourcePath', 'destinationPath'],
    },
  },

  file_rename: {
    name: 'file_rename',
    category: 'files',
    label: 'Rename File',
    description: 'Renames a file in the sandboxed filesystem.',
    permissionKey: 'files',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        oldPath: { type: 'string', description: 'Current file path.' },
        newPath: { type: 'string', description: 'New file name or path.' },
      },
      required: ['oldPath', 'newPath'],
    },
  },

  file_delete: {
    name: 'file_delete',
    category: 'files',
    label: 'Delete File',
    description: 'Deletes a file from the sandboxed filesystem. This is a sensitive action that requires user confirmation.',
    permissionKey: 'files',
    isSensitive: true,
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path of file to delete.' },
        confirmed: { type: 'boolean', description: 'Whether the user explicitly confirmed deletion.' },
      },
      required: ['filePath'],
    },
  },

  file_organize: {
    name: 'file_organize',
    category: 'files',
    label: 'Batch Organize Folder',
    description: 'Inspects a directory (e.g. /Downloads), categorizes files by type (Images, Documents, Data, Media, Archives), creates category folders, moves files, and reports the exact actions taken.',
    permissionKey: 'files',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        folderPath: { type: 'string', description: 'Directory to organize (e.g. "/Downloads"). Defaults to "/Downloads".' },
      },
    },
  },

  // 4. Email Operations Tools
  email_search: {
    name: 'email_search',
    category: 'email',
    label: 'Search Emails',
    description: 'Searches user emails by sender, recipient, subject, or message body content.',
    permissionKey: 'email',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or query (e.g. "John", "meeting", "invoice").' },
        folder: { type: 'string', description: 'Optional folder to filter', enum: ['inbox', 'sent', 'drafts', 'all'] },
      },
      required: ['query'],
    },
  },

  email_read: {
    name: 'email_read',
    category: 'email',
    label: 'Read Email',
    description: 'Retrieves the complete content, sender, timestamp, and attachments of an email by its ID.',
    permissionKey: 'email',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        emailId: { type: 'string', description: 'ID of the email to read.' },
      },
      required: ['emailId'],
    },
  },

  email_draft: {
    name: 'email_draft',
    category: 'email',
    label: 'Draft Email',
    description: 'Creates and saves a draft email to the user Drafts folder.',
    permissionKey: 'email',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address or contact name.' },
        subject: { type: 'string', description: 'Email subject line.' },
        body: { type: 'string', description: 'Body text or markdown of the email.' },
      },
      required: ['to', 'subject', 'body'],
    },
  },

  email_send: {
    name: 'email_send',
    category: 'email',
    label: 'Send Email',
    description: 'Sends an email to the specified recipient. This is an external sensitive action that requires user confirmation.',
    permissionKey: 'email',
    isSensitive: true,
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address.' },
        subject: { type: 'string', description: 'Email subject line.' },
        body: { type: 'string', description: 'Email body text.' },
        confirmed: { type: 'boolean', description: 'Whether the user explicitly confirmed sending.' },
      },
      required: ['to', 'subject', 'body'],
    },
  },

  // 5. Code Execution Tools
  code_execute: {
    name: 'code_execute',
    category: 'code',
    label: 'Execute Code',
    description: 'Runs code in a sandboxed, isolated execution engine and captures stdout, errors, and execution metrics.',
    permissionKey: 'codeExecution',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Programming language', enum: ['javascript', 'typescript', 'python'] },
        code: { type: 'string', description: 'Code block to execute.' },
      },
      required: ['language', 'code'],
    },
  },

  // 6. Computer / Controlled Environment Tools
  computer_action: {
    name: 'computer_action',
    category: 'computer',
    label: 'Controlled Computer Action',
    description: 'Performs controlled actions in the sandboxed mission computer environment (system status, terminal commands, screen inspection).',
    permissionKey: 'computerControl',
    isSensitive: false,
    parameters: {
      type: 'object',
      properties: {
        action: { 
          type: 'string', 
          description: 'Type of computer action',
          enum: ['system_info', 'run_terminal', 'inspect_screen', 'open_app'] 
        },
        command: { type: 'string', description: 'Optional command or application parameter.' },
      },
      required: ['action'],
    },
  },
};

export function getToolsForAgent(enabledTools: string[], permissions?: Record<string, boolean>): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY).filter((tool) => {
    // 1. Must be in enabledTools
    if (!enabledTools.includes(tool.name)) return false;
    // 2. If permissions object is provided, check permission
    if (permissions && permissions[tool.permissionKey] === false) return false;
    return true;
  });
}
