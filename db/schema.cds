using { cuid, managed } from '@sap/cds/common';

namespace jira.api;

// External JIRA API entities (read-only views)
entity Issues : cuid, managed {
  jiraKey     : String(50);
  summary     : String(500);
  description : LargeString;
  issueType   : String(100);
  status      : String(100);
  priority    : String(100);
  assignee    : String(100);
  reporter    : String(100);
  project     : String(100);
  created     : DateTime;
  updated     : DateTime;
}

entity Projects : cuid {
  jiraKey     : String(50);
  name        : String(200);
  description : LargeString;
  projectType : String(100);
  lead        : String(100);
}

entity Users : cuid {
  accountId   : String(128);
  displayName : String(200);
  emailAddress : String(254);
  active      : Boolean;
}

// Local entities for caching/processing
entity IssueCache : cuid, managed {
  jiraKey     : String(50);
  summary     : String(500);
  status      : String(100);
  lastSync    : DateTime;
  rawData     : LargeString; // Store full JIRA response
}

entity ApiConfig : cuid, managed {
  name        : String(100);
  baseUrl     : String(500);
  username    : String(100);
  token       : String(500); // Encrypted token
  active      : Boolean default true;
}
