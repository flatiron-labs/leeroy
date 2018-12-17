// Type definitions for Leeroy
// Project: Leeroy
// Definitions by: @gj <https://github.com/gj>

export interface SlackChannel {
  created: number;
  creator: string;
  id: string;
  is_archived: boolean;
  is_channel: boolean;
  is_ext_shared: boolean;
  is_general: boolean;
  is_group: boolean;
  is_im: boolean;
  is_member: boolean;
  is_mpim: boolean;
  is_open: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  is_private: boolean;
  is_shared: boolean;
  last_read: string;
  name: string;
  name_normalized: string;
  parent_conversation: any;
  pending_shared: any[];
  purpose: {
    value: string;
    creator: string;
    last_set: number;
  };
  shared_team_ids: string[];
  topic: {
    value: string;
    creator: string;
    last_set: number;
  };
  unlinked: number;
}

export interface SlackChannelResponse {
  channel?: SlackChannel;
  error?: string;
  ok: boolean;
}

interface SlackInteractiveMessageActionSelectedOption {
  value: string;
}

interface SlackInteractiveMessageAction {
  name: string;
  selected_options: SlackInteractiveMessageActionSelectedOption[];
  type: string;
}

export interface SlackInteractiveMessageResponse {
  action_ts: string;
  actions: SlackInteractiveMessageAction[];
  attachment_id: string;
  callback_id: string;
  channel: {
    id: string;
    name: string;
  };
  is_app_unfurl: boolean;
  message_ts: string;
  response_url: string;
  team: {
    domain: string;
    id: string;
  };
  token: string;
  trigger_id: string;
  type: string;
  user: {
    id: string;
    name: string;
  };
}

export interface SlackPostMessageResponse {
  ok: boolean;
  error?: string;
  warning?: string;
  response_metadata?: {
    warnings: string[];
  };
  channel?: string;
  message?: {
    type: string;
    subtype: string;
    text: string;
    ts: string;
    username: string;
    bot_id: string;
  };
  ts?: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface CircleCIBuildPayload {
  compare: any | null;
  previous_successful_build: {
    build_num: number;
    status: string;
    build_time_millis: number;
  };
  build_parameters: {
    CIRCLE_JOB: string;
    DEPLOY_ENV: string;
    SLACK_USER_ID: string;
    SLACK_USERNAME: string;
    TRIGGERED_BY: string;
  };
  oss: boolean;
  committer_date: any | null;
  body: any | null;
  usage_queued_at: string;
  fail_reason: any | null;
  retry_of: any | null;
  reponame: string;
  ssh_users: any[];
  build_url: string;
  parallel: number;
  failed: any | null;
  branch: string;
  username: string;
  author_date: any | null;
  why: string;
  user: {
    is_user: boolean;
    login: string;
  };
  vcs_revision: string;
  vcs_tag: any | null;
  build_num: number;
  infrastructure_fail: boolean;
  committer_email: any | null;
  previous: {
    build_num: number;
    status: string;
    build_time_millis: number;
  };
  status: string;
  committer_name: any | null;
  retries: any | null;
  subject: any | null;
  vcs_type: string;
  timedout: boolean;
  dont_build: any | null;
  lifecycle: string;
  no_dependency_cache: boolean;
  stop_time: any | null;
  ssh_disabled: boolean;
  build_time_millis: any | null;
  picard: any | null;
  circle_yml: { string: string };
  messages: any[];
  is_first_green_build: boolean;
  job_name: any | null;
  start_time: any | null;
  canceler: any | null;
  platform: string;
  outcome: any | null;
  vcs_url: string;
  author_name: any | null;
  node: any | null;
  canceled: boolean;
  author_email: any | null;
}
