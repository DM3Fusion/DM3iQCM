export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      case_activity: {
        Row: {
          actor_user_id: string | null
          case_id: string
          created_at: string
          event_data: Json
          event_type: string
          id: string
          organization_id: string
        }
        Insert: {
          actor_user_id?: string | null
          case_id: string
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          organization_id: string
        }
        Update: {
          actor_user_id?: string | null
          case_id?: string
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_activity_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_activity_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "case_operational_status"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "case_activity_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "case_progress"
            referencedColumns: ["organization_id", "case_id"]
          },
          {
            foreignKeyName: "case_activity_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      case_assignments: {
        Row: {
          assigned_at: string
          assigned_by_user_id: string
          assignment_role: Database["public"]["Enums"]["assignment_role"]
          case_id: string
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          unassigned_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_user_id: string
          assignment_role?: Database["public"]["Enums"]["assignment_role"]
          case_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          unassigned_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_user_id?: string
          assignment_role?: Database["public"]["Enums"]["assignment_role"]
          case_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          unassigned_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_assignments_assigned_by_user_id_fkey"
            columns: ["assigned_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_assignments_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "case_operational_status"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "case_assignments_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "case_progress"
            referencedColumns: ["organization_id", "case_id"]
          },
          {
            foreignKeyName: "case_assignments_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "case_assignments_organization_id_user_id_fkey"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      case_tasks: {
        Row: {
          assigned_user_id: string | null
          case_id: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          created_by_user_id: string
          description: string
          due_at: string | null
          id: string
          organization_id: string
          required: boolean
          sequence: number
          status: Database["public"]["Enums"]["case_task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          case_id: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string
          due_at?: string | null
          id?: string
          organization_id: string
          required?: boolean
          sequence?: number
          status?: Database["public"]["Enums"]["case_task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          case_id?: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string
          due_at?: string | null
          id?: string
          organization_id?: string
          required?: boolean
          sequence?: number
          status?: Database["public"]["Enums"]["case_task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_tasks_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_tasks_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_tasks_organization_id_assigned_user_id_fkey"
            columns: ["organization_id", "assigned_user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "case_tasks_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "case_operational_status"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "case_tasks_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "case_progress"
            referencedColumns: ["organization_id", "case_id"]
          },
          {
            foreignKeyName: "case_tasks_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      cases: {
        Row: {
          case_number: string
          case_type: string
          closed_at: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          customer_id: string
          description: string
          due_at: string | null
          id: string
          manager_user_id: string | null
          opened_at: string
          organization_id: string
          priority: Database["public"]["Enums"]["priority_level"]
          status: Database["public"]["Enums"]["case_status"]
          title: string
          updated_at: string
        }
        Insert: {
          case_number: string
          case_type: string
          closed_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          customer_id: string
          description?: string
          due_at?: string | null
          id?: string
          manager_user_id?: string | null
          opened_at?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["case_status"]
          title: string
          updated_at?: string
        }
        Update: {
          case_number?: string
          case_type?: string
          closed_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          customer_id?: string
          description?: string
          due_at?: string | null
          id?: string
          manager_user_id?: string | null
          opened_at?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          status?: Database["public"]["Enums"]["case_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_organization_id_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_organization_id_manager_user_id_fkey"
            columns: ["organization_id", "manager_user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      customer_portal_users: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_users_organization_id_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_portal_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          customer_number: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          status: Database["public"]["Enums"]["customer_status"]
          type: Database["public"]["Enums"]["customer_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          customer_number: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          type: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          customer_number?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_case_number_counters: {
        Row: {
          next_number: number
          organization_id: string
        }
        Insert: {
          next_number?: number
          organization_id: string
        }
        Update: {
          next_number?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_case_number_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_customer_number_counters: {
        Row: {
          next_number: number
          organization_id: string
        }
        Insert: {
          next_number?: number
          organization_id: string
        }
        Update: {
          next_number?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_customer_number_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["application_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          organization_id: string
          role: Database["public"]["Enums"]["application_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["application_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["organization_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
        }
        Relationships: []
      }
      platform_user_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["application_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["application_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["application_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          assigned_user_id: string | null
          case_id: string | null
          closed_at: string | null
          created_at: string
          customer_id: string
          description: string
          id: string
          last_activity_at: string
          opened_at: string
          organization_id: string
          priority: Database["public"]["Enums"]["priority_level"]
          request_number: string
          requester_user_id: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          case_id?: string | null
          closed_at?: string | null
          created_at?: string
          customer_id: string
          description?: string
          id?: string
          last_activity_at?: string
          opened_at?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["priority_level"]
          request_number: string
          requester_user_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          case_id?: string | null
          closed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          last_activity_at?: string
          opened_at?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          request_number?: string
          requester_user_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_organization_id_assigned_user_id_fkey"
            columns: ["organization_id", "assigned_user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "service_requests_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "case_operational_status"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_requests_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "case_progress"
            referencedColumns: ["organization_id", "case_id"]
          },
          {
            foreignKeyName: "service_requests_organization_id_case_id_fkey"
            columns: ["organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_requests_organization_id_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_requests_organization_id_customer_id_requester_use_fkey"
            columns: ["organization_id", "customer_id", "requester_user_id"]
            isOneToOne: false
            referencedRelation: "customer_portal_users"
            referencedColumns: ["organization_id", "customer_id", "user_id"]
          },
        ]
      }
    }
    Views: {
      case_operational_status: {
        Row: {
          case_number: string | null
          case_type: string | null
          closed_at: string | null
          completed_at: string | null
          created_at: string | null
          created_by_user_id: string | null
          customer_id: string | null
          description: string | null
          due_at: string | null
          id: string | null
          is_overdue: boolean | null
          manager_user_id: string | null
          opened_at: string | null
          organization_id: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          status: Database["public"]["Enums"]["case_status"] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          case_number?: string | null
          case_type?: string | null
          closed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string | null
          is_overdue?: never
          manager_user_id?: string | null
          opened_at?: string | null
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          status?: Database["public"]["Enums"]["case_status"] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          case_number?: string | null
          case_type?: string | null
          closed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string | null
          is_overdue?: never
          manager_user_id?: string | null
          opened_at?: string | null
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          status?: Database["public"]["Enums"]["case_status"] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_organization_id_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_organization_id_manager_user_id_fkey"
            columns: ["organization_id", "manager_user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      case_progress: {
        Row: {
          case_id: string | null
          completed_required_tasks: number | null
          organization_id: string | null
          percentage: number | null
          remaining_required_tasks: number | null
          total_required_tasks: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_case: {
        Args: {
          check_case_id: string
          check_organization_id: string
          check_user_id?: string
        }
        Returns: boolean
      }
      can_manage_case: {
        Args: { target_organization_id: string; target_user_id?: string }
        Returns: boolean
      }
      create_case_task: {
        Args: {
          target_assigned_user_id?: string
          target_case_id: string
          target_description?: string
          target_due_at?: string
          target_required?: boolean
          target_title: string
        }
        Returns: {
          assigned_user_id: string | null
          case_id: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          created_by_user_id: string
          description: string
          due_at: string | null
          id: string
          organization_id: string
          required: boolean
          sequence: number
          status: Database["public"]["Enums"]["case_task_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "case_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_case_workflow: {
        Args: {
          target_case_type: string
          target_customer_id: string
          target_description: string
          target_due_at?: string
          target_initial_tasks?: Json
          target_manager_user_id?: string
          target_organization_id: string
          target_priority: Database["public"]["Enums"]["priority_level"]
          target_staff_user_ids?: string[]
          target_title: string
        }
        Returns: {
          case_number: string
          case_type: string
          closed_at: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          customer_id: string
          description: string
          due_at: string | null
          id: string
          manager_user_id: string | null
          opened_at: string
          organization_id: string
          priority: Database["public"]["Enums"]["priority_level"]
          status: Database["public"]["Enums"]["case_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_customer_record: {
        Args: {
          target_email?: string
          target_name: string
          target_notes?: string
          target_organization_id: string
          target_phone?: string
          target_type: Database["public"]["Enums"]["customer_type"]
        }
        Returns: {
          created_at: string
          created_by_user_id: string | null
          customer_number: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          status: Database["public"]["Enums"]["customer_status"]
          type: Database["public"]["Enums"]["customer_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_organization: {
        Args: { target_name: string; target_slug: string }
        Returns: Database["public"]["Tables"]["organizations"]["Row"]
      }
      delete_case_task: { Args: { target_task_id: string }; Returns: undefined }
      get_case_progress: {
        Args: { target_case_id: string }
        Returns: {
          completed_required_tasks: number
          percentage: number
          remaining_required_tasks: number
          total_required_tasks: number
        }[]
      }
      has_organization_role: {
        Args: {
          allowed_roles: Database["public"]["Enums"]["application_role"][]
          check_organization_id: string
          check_user_id?: string
        }
        Returns: boolean
      }
      is_customer_portal_user: {
        Args: {
          check_customer_id: string
          check_organization_id: string
          check_user_id?: string
        }
        Returns: boolean
      }
      is_internal_member: {
        Args: { check_organization_id: string; check_user_id?: string }
        Returns: boolean
      }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
      provision_organization_member: {
        Args: { target_email: string; target_organization_id: string; target_role: Database["public"]["Enums"]["application_role"] }
        Returns: Database["public"]["Tables"]["organization_members"]["Row"]
      }
      is_valid_organization_actor: {
        Args: { target_organization_id: string; target_user_id: string }
        Returns: boolean
      }
      move_case_task: {
        Args: { target_direction: string; target_task_id: string }
        Returns: undefined
      }
      next_case_number: {
        Args: { target_organization_id: string }
        Returns: string
      }
      next_customer_number: {
        Args: { target_organization_id: string }
        Returns: string
      }
      set_case_assignment: {
        Args: {
          target_active?: boolean
          target_assignment_role: Database["public"]["Enums"]["assignment_role"]
          target_case_id: string
          target_user_id: string
        }
        Returns: undefined
      }
      transition_case_status: {
        Args: {
          target_case_id: string
          target_status: Database["public"]["Enums"]["case_status"]
        }
        Returns: {
          case_number: string
          case_type: string
          closed_at: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          customer_id: string
          description: string
          due_at: string | null
          id: string
          manager_user_id: string | null
          opened_at: string
          organization_id: string
          priority: Database["public"]["Enums"]["priority_level"]
          status: Database["public"]["Enums"]["case_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_organization: {
        Args: { target_name: string; target_organization_id: string; target_slug: string; target_status: Database["public"]["Enums"]["organization_status"] }
        Returns: Database["public"]["Tables"]["organizations"]["Row"]
      }
      update_organization_membership: {
        Args: { target_active: boolean; target_membership_id: string; target_role: Database["public"]["Enums"]["application_role"] }
        Returns: Database["public"]["Tables"]["organization_members"]["Row"]
      }
      update_case_task: {
        Args: {
          target_assigned_user_id: string
          target_description: string
          target_due_at: string
          target_required: boolean
          target_status: Database["public"]["Enums"]["case_task_status"]
          target_task_id: string
          target_title: string
        }
        Returns: {
          assigned_user_id: string | null
          case_id: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          created_by_user_id: string
          description: string
          due_at: string | null
          id: string
          organization_id: string
          required: boolean
          sequence: number
          status: Database["public"]["Enums"]["case_task_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "case_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      write_case_event: {
        Args: {
          target_actor_id: string
          target_case_id: string
          target_event_data?: Json
          target_event_type: string
          target_organization_id: string
        }
        Returns: string
      }
    }
    Enums: {
      application_role:
        | "SUPER_ADMIN"
        | "BUSINESS_ADMIN"
        | "BUSINESS_OWNER"
        | "STAFF_MANAGER"
        | "STAFF_USER"
        | "PUBLIC_USER"
      assignment_role: "MANAGER" | "STAFF"
      case_status:
        | "NEW"
        | "UNASSIGNED"
        | "ASSIGNED"
        | "IN_PROGRESS"
        | "WAITING"
        | "REVIEW"
        | "COMPLETED"
        | "CLOSED"
        | "CANCELLED"
      case_task_status:
        | "NOT_STARTED"
        | "IN_PROGRESS"
        | "BLOCKED"
        | "COMPLETED"
        | "NOT_APPLICABLE"
      customer_status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
      customer_type: "INDIVIDUAL" | "BUSINESS" | "ORGANIZATION"
      organization_status: "ACTIVE" | "SUSPENDED" | "ARCHIVED"
      priority_level: "LOW" | "NORMAL" | "HIGH" | "URGENT"
      service_request_status:
        | "NEW"
        | "OPEN"
        | "PENDING_CUSTOMER"
        | "PENDING_STAFF"
        | "RESOLVED"
        | "CLOSED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      application_role: [
        "SUPER_ADMIN",
        "BUSINESS_ADMIN",
        "BUSINESS_OWNER",
        "STAFF_MANAGER",
        "STAFF_USER",
        "PUBLIC_USER",
      ],
      assignment_role: ["MANAGER", "STAFF"],
      case_status: [
        "NEW",
        "UNASSIGNED",
        "ASSIGNED",
        "IN_PROGRESS",
        "WAITING",
        "REVIEW",
        "COMPLETED",
        "CLOSED",
        "CANCELLED",
      ],
      case_task_status: [
        "NOT_STARTED",
        "IN_PROGRESS",
        "BLOCKED",
        "COMPLETED",
        "NOT_APPLICABLE",
      ],
      customer_status: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      customer_type: ["INDIVIDUAL", "BUSINESS", "ORGANIZATION"],
      organization_status: ["ACTIVE", "SUSPENDED", "ARCHIVED"],
      priority_level: ["LOW", "NORMAL", "HIGH", "URGENT"],
      service_request_status: [
        "NEW",
        "OPEN",
        "PENDING_CUSTOMER",
        "PENDING_STAFF",
        "RESOLVED",
        "CLOSED",
      ],
    },
  },
} as const
