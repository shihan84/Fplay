'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { domainsApi } from '@/lib/api'
import type { DomainConfig } from '@/types'
import { toast } from 'sonner'
import {
  Globe, Plus, Trash2, Shield, ShieldCheck, ShieldAlert,
  ShieldOff, RefreshCw, Star, ExternalLink, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

// ─── Helpers ────────────────────────────────────────────────────────────────

const SSL_STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  none: { icon: ShieldOff, label: 'No SSL', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  pending: { icon: Shield, label: 'Pending', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  active: { icon: ShieldCheck, label: 'Active', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  error: { icon: ShieldAlert, label: 'Error', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

// ─── Main Component ────────────────────────────────────────────────────────

export function DomainsPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [newSsl, setNewSsl] = useState(true)
  const [newDefault, setNewDefault] = useState(false)

  const { data: domains = [], isLoading } = useQuery<DomainConfig[]>({
    queryKey: ['domains'],
    queryFn: domainsApi.list,
    refetchInterval: 15000,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      domainsApi.create({ domain: newDomain, sslEnabled: newSsl, isDefault: newDefault }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] })
      toast.success(`Domain "${newDomain}" added`)
      setDialogOpen(false)
      setNewDomain('')
      setNewSsl(true)
      setNewDefault(false)
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add domain'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => domainsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] })
      toast.success('Domain removed')
    },
  })

  const toggleSslMutation = useMutation({
    mutationFn: (d: DomainConfig) =>
      domainsApi.update(d.id, { sslEnabled: !d.sslEnabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['domains'] }),
  })

  const setDefaultMutation = useMutation({
    mutationFn: (d: DomainConfig) =>
      domainsApi.update(d.id, { isDefault: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] })
      toast.success('Default domain updated')
    },
  })

  const reloadMutation = useMutation({
    mutationFn: () => domainsApi.reload(),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['domains'] })
      toast.success(data.message || 'Caddy reloaded successfully')
    },
    onError: (err: any) => toast.error(err.message || 'Failed to reload Caddy'),
  })

  const sslCount = domains.filter((d) => d.sslEnabled).length
  const activeCount = domains.filter((d) => d.sslStatus === 'active').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Domains & SSL</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage domains and automatic Let's Encrypt SSL certificates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => reloadMutation.mutate()}
            disabled={reloadMutation.isPending || domains.length === 0}
            variant="outline"
            className="border-zinc-700 text-zinc-300 gap-2"
          >
            {reloadMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Apply & Reload
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Plus className="size-4" />
            Add Domain
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500">Total Domains</p>
            <p className="text-2xl font-bold text-zinc-100">{domains.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500">SSL Enabled</p>
            <p className="text-2xl font-bold text-emerald-400">{sslCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500">Certs Active</p>
            <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500">SSL Provider</p>
            <p className="text-sm font-bold text-zinc-300 mt-1">Let's Encrypt</p>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ShieldCheck className="size-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-zinc-400">
              <p className="text-blue-300 font-medium mb-1">How SSL works</p>
              <ul className="space-y-1 text-xs">
                <li>• Add your domain and ensure its <strong>DNS A record</strong> points to this server's IP</li>
                <li>• Enable SSL — Caddy will automatically obtain a Let's Encrypt certificate</li>
                <li>• Click <strong>"Apply & Reload"</strong> to activate the new configuration</li>
                <li>• Certificates auto-renew before expiry — no manual action needed</li>
                <li>• Multiple domains can be added and each will get its own certificate</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-zinc-500">Loading domains...</div>
      ) : domains.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Globe className="size-10 text-zinc-700" />
            <p className="text-zinc-500">No domains configured</p>
            <p className="text-xs text-zinc-600 text-center max-w-md">
              Add a domain to enable HTTPS. Without any domains, Fplay listens on port 80 for all hosts.
            </p>
            <Button onClick={() => setDialogOpen(true)} variant="outline" className="border-zinc-700 text-zinc-300 gap-2">
              <Plus className="size-4" />
              Add your first domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => {
            const sslCfg = SSL_STATUS_CONFIG[d.sslStatus] || SSL_STATUS_CONFIG.none
            const SslIcon = sslCfg.icon
            return (
              <Card key={d.id} className="border-zinc-800 bg-zinc-900/60">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Domain info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-9 rounded-md bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Globe className="size-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-zinc-200 break-all">{d.domain}</span>
                          {d.isDefault && (
                            <Badge variant="outline" className="text-xs bg-amber-500/15 text-amber-400 border-amber-500/30">
                              <Star className="size-3 mr-1" />
                              Default
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-xs ${sslCfg.color}`}>
                            <SslIcon className="size-3 mr-1" />
                            {sslCfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-600">
                          <span>SSL: {d.sslEnabled ? 'Enabled' : 'Disabled'}</span>
                          {d.sslExpiry && (
                            <span>Expires: {new Date(d.sslExpiry).toLocaleDateString()}</span>
                          )}
                          <a
                            href={`${d.sslEnabled ? 'https' : 'http'}://${d.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400"
                          >
                            <ExternalLink className="size-3" /> Visit
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-zinc-500">SSL</Label>
                        <Switch
                          checked={d.sslEnabled}
                          onCheckedChange={() => toggleSslMutation.mutate(d)}
                        />
                      </div>
                      {!d.isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDefaultMutation.mutate(d)}
                          className="text-zinc-500 hover:text-amber-400 text-xs gap-1"
                          title="Set as default"
                        >
                          <Star className="size-3" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Remove domain "${d.domain}"?`)) {
                            deleteMutation.mutate(d.id)
                          }
                        }}
                        className="text-zinc-600 hover:text-red-400 size-8"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add domain dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300">Domain Name</Label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com or stream.example.com"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newDomain.trim()) createMutation.mutate()
                }}
              />
              <p className="text-xs text-zinc-600">
                Make sure the DNS A record points to this server's IP before enabling SSL
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-zinc-300">Enable SSL (HTTPS)</Label>
                <p className="text-xs text-zinc-600">Auto-provision Let's Encrypt certificate</p>
              </div>
              <Switch checked={newSsl} onCheckedChange={setNewSsl} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-zinc-300">Set as Default</Label>
                <p className="text-xs text-zinc-600">Primary domain for this instance</p>
              </div>
              <Switch checked={newDefault} onCheckedChange={setNewDefault} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700 text-zinc-300">
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newDomain.trim() || createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Domain'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
