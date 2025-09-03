using {jira.api as jira} from '../db/schema';

service JiraService {

  // JIRA API proxy endpoints
  @readonly
  entity Issues     as projection on jira.Issues;

  @readonly
  entity Projects   as projection on jira.Projects;

  @readonly
  entity Users      as projection on jira.Users;

  // Local cache management
  entity IssueCache as projection on jira.IssueCache;
  entity ApiConfig  as projection on jira.ApiConfig;

  // Custom actions for JIRA operations
  action   syncIssues()                      returns String;
  action   getIssueByKey(jiraKey: String)    returns Issues;
  action   searchIssues(jql: String)         returns array of Issues;

  action   searchByJQL(jql: String)     returns String; // Returns JSON string with search metadata

  action   createIssue(projectKey: String,
                       summary: String,
                       description: String,
                       issueType: String)    returns String;

  action   updateIssue(jiraKey: String,
                       summary: String,
                       description: String)  returns String;

  // Configuration functions
  function testConnection()                  returns String;
  function getProjects()                     returns array of Projects;

  function getMyOpenIssues() returns String; // Returns JSON string with my open issues
  function getAbapOpenIssues() returns String; // Returns JSON string with my open ABAP issues
}
