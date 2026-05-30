import { useParams } from 'react-router-dom';
import { useStorefrontBySlug, useTutorRatings } from '@/hooks/useTutorStorefront';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { RatingDialog } from '@/components/tutor/RatingDialog';
import { FollowTutorButton } from '@/components/tutor/FollowTutorButton';
import { MessageUserButton } from '@/components/chat/MessageUserButton';

export default function StorefrontPublic() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useStorefrontBySlug(slug);
  const ratings = useTutorRatings(data?.tutor_id);

  if (isLoading) return <div className="p-8 text-center">Loading…</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Storefront not found.</div>;

  const profile: any = data.profiles ?? {};
  const avg = ratings.data?.length ? ratings.data.reduce((a, b) => a + b.rating, 0) / ratings.data.length : 0;

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20"><AvatarImage src={profile.avatar_url}/><AvatarFallback>{profile.full_name?.[0] ?? 'T'}</AvatarFallback></Avatar>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                {profile.full_name}
                {profile.is_official && <OfficialBadge size="sm" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{data.headline}</p>
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(n => <Star key={n} className={`w-4 h-4 ${n<=Math.round(avg)?'fill-primary text-primary':'text-muted'}`}/>)}
                <span className="text-xs text-muted-foreground ml-1">{avg.toFixed(1)} ({ratings.data?.length ?? 0})</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-line">{data.bio}</p>
          <div className="flex flex-wrap gap-2">
            <FollowTutorButton tutorId={data.tutor_id} />
            <MessageUserButton userId={data.tutor_id} label="Message tutor" />
            <RatingDialog tutorId={data.tutor_id} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reviews</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(ratings.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
          {(ratings.data ?? []).map((r: any) => (
            <div key={r.id} className="border-b pb-3 last:border-0">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6"><AvatarImage src={r.profiles?.avatar_url}/><AvatarFallback>{r.profiles?.full_name?.[0] ?? '?'}</AvatarFallback></Avatar>
                <span className="text-sm font-medium">{r.profiles?.full_name ?? 'Student'}</span>
                <div className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`w-3 h-3 ${n<=r.rating?'fill-primary text-primary':'text-muted'}`}/>)}</div>
              </div>
              {r.review && <p className="text-sm mt-1">{r.review}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
