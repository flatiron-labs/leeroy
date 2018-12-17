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

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}
