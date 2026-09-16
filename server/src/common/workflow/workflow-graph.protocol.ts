export type WorkflowStage =
  | 'AUTHORING'
  | 'PROCESS_REVIEW'
  | 'FINAL_APPROVAL'
  | 'TTE'
  | 'EFFECTIVE'
  | 'SUPERSEDED'
  | 'REVOKED';

export type WorkflowActionRule<Action extends string, Role extends string> = Readonly<{
  action: Action;
  roles: readonly Role[];
}>;

export type WorkflowNodeSpec<Action extends string, Role extends string> = Readonly<{
  stage: WorkflowStage;
  actions?: readonly WorkflowActionRule<Action, Role>[];
  terminal?: boolean;
}>;

export type WorkflowTransitionSpec<
  State extends string,
  Action extends string,
  Role extends string,
> = Readonly<{
  from: State;
  to: State;
  action: Action;
  roles: readonly Role[];
}>;

export type WorkflowGraphDefinition<
  State extends string,
  Action extends string,
  Role extends string,
> = Readonly<{
  nodes: Readonly<Record<State, WorkflowNodeSpec<Action, Role>>>;
  transitions: readonly WorkflowTransitionSpec<State, Action, Role>[];
  globalActions?: readonly WorkflowActionRule<Action, Role>[];
  actionOrder?: readonly Action[];
}>;

export function defineWorkflowGraph<
  State extends string,
  Action extends string,
  Role extends string,
>(
  graph: WorkflowGraphDefinition<State, Action, Role>,
): WorkflowGraphDefinition<State, Action, Role> {
  return graph;
}

export function getWorkflowNode<
  State extends string,
  Action extends string,
  Role extends string,
>(
  graph: WorkflowGraphDefinition<State, Action, Role>,
  state: State,
): WorkflowNodeSpec<Action, Role> {
  return graph.nodes[state];
}

export function findWorkflowTransition<
  State extends string,
  Action extends string,
  Role extends string,
>(
  graph: WorkflowGraphDefinition<State, Action, Role>,
  from: State,
  to: State,
): WorkflowTransitionSpec<State, Action, Role> | undefined {
  return graph.transitions.find((transition) => transition.from === from && transition.to === to);
}

function ruleAllowsRole<Action extends string, Role extends string>(
  rule: WorkflowActionRule<Action, Role>,
  role: Role,
): boolean {
  return rule.roles.includes(role);
}

export function getAllowedWorkflowActions<
  State extends string,
  Action extends string,
  Role extends string,
>(
  graph: WorkflowGraphDefinition<State, Action, Role>,
  role: Role,
  state: State,
): readonly Action[] {
  const node = graph.nodes[state];
  const candidates: Action[] = [];

  for (const rule of graph.globalActions ?? []) {
    if (ruleAllowsRole(rule, role)) candidates.push(rule.action);
  }
  for (const rule of node.actions ?? []) {
    if (ruleAllowsRole(rule, role)) candidates.push(rule.action);
  }
  for (const transition of graph.transitions) {
    if (transition.from === state && transition.roles.includes(role)) {
      candidates.push(transition.action);
    }
  }

  const unique = new Set(candidates);
  const ordered: Action[] = [];
  for (const action of graph.actionOrder ?? []) {
    if (unique.delete(action)) ordered.push(action);
  }
  for (const action of unique) ordered.push(action);
  return ordered;
}

export function getWorkflowStatesForActions<
  State extends string,
  Action extends string,
  Role extends string,
>(
  graph: WorkflowGraphDefinition<State, Action, Role>,
  role: Role,
  actions: readonly Action[],
): readonly State[] {
  const wanted = new Set(actions);
  return (Object.keys(graph.nodes) as State[]).filter((state) =>
    getAllowedWorkflowActions(graph, role, state).some((action) => wanted.has(action)),
  );
}
