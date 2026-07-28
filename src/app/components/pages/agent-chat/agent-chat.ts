import { Component, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AgentChatService } from '../../../services/agent-chat.service';
import { AuthService } from '../../../services/auth.service';
import { Role } from '../../../models/enums/role.enum';
import {
  ChatHistoryItem,
  ConfirmedAction,
  PendingConfirmation,
  UiChatMessage,
} from '../../../models/agent/agent-chat.model';

@Pipe({ name: 'stripMarkdown', standalone: true })
export class StripMarkdownPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return value;
    return value
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/^>\s/gm, '')
      .replace(/^\s*[-*+]\s/gm, '')
      .replace(/^\s*\d+\.\s/gm, '');
  }
}

@Component({
  selector: 'app-agent-chat',
  imports: [CommonModule, FormsModule, RouterLink, StripMarkdownPipe],
  templateUrl: './agent-chat.html',
  styleUrl: './agent-chat.css',
})
export class AgentChat implements AfterViewChecked {
  @ViewChild('scrollAnchor') private scrollAnchor?: ElementRef<HTMLDivElement>;

  messages: UiChatMessage[] = [];
  draft = '';
  isSending = false;
  errorMessage: string | null = null;
  isAdmin = false;
  private shouldScroll = false;
  processingConfirmationId: string | null = null;
  userPhotoUrl: string | null = null;
  imageTimestamp: number = Date.now();

  readonly suggestions = [
    'Show my most important open tickets',
    'List all open tickets',
    'Create a ticket: login page returns 500 after password reset',
    'Search tickets about billing',
  ];

  constructor(
    private agentChatService: AgentChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    const user = this.authService.getUser();
    this.isAdmin = user?.role === Role.ADMIN;
    this.userPhotoUrl = user?.profilePhotoUrl || null;
    
    // Subscribe to user changes for reactive profile photo updates
    this.authService.user$.subscribe(user => {
      if (user) {
        this.userPhotoUrl = user.profilePhotoUrl || null;
        this.imageTimestamp = Date.now();
        this.cdr.markForCheck();
      }
    });
    
    this.messages.push({
      id: this.newId(),
      role: 'assistant',
      content:
        'I am SupportAI. I can list and prioritize open tickets, create tickets , search, and close or delete tickets after you confirm. What would you like to do?',
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  useSuggestion(text: string): void {
    this.draft = text;
    this.cdr.markForCheck();
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.isSending) return;
    this.draft = '';
    this.pushUserMessage(text);
    this.callAgent(text);
  }

  confirmAction(pending: PendingConfirmation, messageId: string): void {
    if (this.isSending || this.processingConfirmationId) return;
    this.processingConfirmationId = messageId;
    const action: ConfirmedAction = {
      action: pending.action as ConfirmedAction['action'],
      ticketId: pending.ticketId,
    };
    this.pushUserMessage('Confirm');
    this.callAgent(undefined, action);
  }

  cancelAction(pending: PendingConfirmation, messageId: string): void {
    if (this.processingConfirmationId) return;
    this.processingConfirmationId = messageId;
    this.pushUserMessage('Cancel');
    this.messages.push({
      id: this.newId(),
      role: 'assistant',
      content: `Cancelled ${pending.action.replace('_', ' ')} for ticket #${pending.ticketId}.`,
    });
    this.shouldScroll = true;
    this.processingConfirmationId = null;
    this.cdr.markForCheck();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private pushUserMessage(content: string): void {
    this.messages.push({ id: this.newId(), role: 'user', content });
    this.shouldScroll = true;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  private callAgent(message?: string, confirmedAction?: ConfirmedAction): void {
    const token = this.authService.getToken();
    if (!token) {
      this.errorMessage = 'You must be logged in to use the agent.';
      return;
    }

    const loadingId = this.newId();
    this.messages.push({
      id: loadingId,
      role: 'assistant',
      content: '',
      isLoading: true,
    });
    this.isSending = true;
    this.shouldScroll = true;
    this.cdr.markForCheck();

    const history: ChatHistoryItem[] = this.messages
      .filter((m) => !m.isLoading && m.content)
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    this.agentChatService
      .sendMessage({
        message,
        history,
        jwtToken: token,
        isAdmin: this.isAdmin,
        confirmedAction,
      })
      .subscribe({
        next: (res) => {
          this.messages = this.messages.filter((m) => m.id !== loadingId);
          this.messages.push({
            id: this.newId(),
            role: 'assistant',
            content: res.reply,
            tickets: res.tickets?.length ? res.tickets : undefined,
            ticketsMessage: res.ticketsMessage,
            pendingConfirmation: res.pendingConfirmation ?? undefined,
            toolTraces: res.toolTraces?.length ? res.toolTraces : undefined,
          });
          this.isSending = false;
          this.processingConfirmationId = null;
          this.shouldScroll = true;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.messages = this.messages.filter((m) => m.id !== loadingId);
          this.errorMessage = err?.error?.detail || 'Agent request failed.';
          this.isSending = false;
          this.processingConfirmationId = null;
          this.cdr.markForCheck();
        },
      });
  }

  private newId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  priorityClass(priority?: string): string {
    if (!priority) return 'priority-none';
    return `priority-${priority.toLowerCase()}`;
  }

  getCacheBustedImageUrl(): string {
    if (!this.userPhotoUrl) return '';
    return `${this.userPhotoUrl}?t=${this.imageTimestamp}`;
  }
}
