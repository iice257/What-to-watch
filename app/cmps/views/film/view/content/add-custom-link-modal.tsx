import { valibotResolver } from '@hookform/resolvers/valibot'
import * as v from 'valibot'
import { DialogFooter } from '../../../../ui/dialog'

import { useForm } from 'react-hook-form'
import { useShallowState } from '../../../../../store'
import { cn } from '../../../../../utils/tw'
import { isValidCustomLink } from '../../../../../vf'
import { Modal } from '../../../../common/modal'
import { Button } from '../../../../ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '../../../../ui/form'
import { Input } from '../../../../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../ui/select'
import { Switch } from '../../../../ui/switch'

enum Property {
  Title = 'title',
  ImdbId = 'imdbId',
  TmdbId = 'tmdbId',
}

const formSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1)),
  baseUrl: v.pipe(
    v.string(),
    v.trim(),
    v.url(),
    v.check((value) => {
      try {
        return ['http:', 'https:'].includes(new URL(value).protocol)
      } catch {
        return false
      }
    }),
  ),
  property: v.enum(Property),
  slug: v.boolean(),
})

type FormData = v.InferOutput<typeof formSchema>

export function AddCustomLinkModal() {
  const {
    userConfig,
    setUserConfig,
    addCustomLinkTypeOpen,
    setAddCustomLinkTypeOpen,
  } = useShallowState((state) => ({
    userConfig: state.userConfig,
    setUserConfig: state.setUserConfig,
    addCustomLinkTypeOpen: state.addCustomLinkTypeOpen,
    setAddCustomLinkTypeOpen: state.setAddCustomLinkTypeOpen,
  }))

  const direction =
    typeof addCustomLinkTypeOpen === 'string' ? addCustomLinkTypeOpen : 'left'

  const form = useForm<FormData>({
    resolver: valibotResolver(formSchema),
    defaultValues: {
      property: Property.Title,
      slug: false,
    },
  })

  function onSubmit(values: FormData) {
    if (!isValidCustomLink(values)) return

    const customLinks = userConfig.customLinks ?? []
    const sameNameIndex = customLinks.findIndex(
      ({ name }) => name === values.name,
    )
    if (sameNameIndex === -1) {
      customLinks.push(values)
    } else {
      customLinks[sameNameIndex] = values
    }
    setUserConfig({
      ...userConfig,
      customLinks: [...customLinks],
    })
    form.reset()
    setAddCustomLinkTypeOpen(false)
  }

  return (
    <Modal
      rootProps={{
        open: Boolean(addCustomLinkTypeOpen),
        onOpenChange: setAddCustomLinkTypeOpen,
        direction,
      }}
      contentProps={{
        className: cn('!absolute !top-full pt-0 lg:pt-0', {
          '!top-auto !bottom-full': direction === 'bottom',
        }),
      }}
      innerContentProps={{
        className: 'p-5 md:p-6',
      }}
      overlay
      portal={false}
      handle={false}
      disableVoroforceKeyboardControls
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className='mb-5 border-white/10 border-b pb-4'>
            <div className='panel-kicker mb-2'>External services</div>
            <h3 className='panel-title'>Add a custom link</h3>
            <p className='panel-description mt-1'>
              Create a reusable movie link from a title or database ID.
            </p>
          </div>
          <div className='grid gap-4 py-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='grid gap-1.5'>
                  <FormLabel className='m-0'>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='baseUrl'
              render={({ field }) => (
                <FormItem className='grid gap-1.5'>
                  <FormLabel className='m-0'>Base URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='property'
              render={({ field }) => (
                <FormItem className='grid gap-1.5'>
                  <FormLabel className='m-0'>Property</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className='m-0'>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='title'>Movie Title</SelectItem>
                      <SelectItem value='tmdbId'>TMDB ID</SelectItem>
                      <SelectItem value='imdbId'>IMDB ID</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='slug'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-md border border-white/10 bg-white/[0.035] p-3'>
                  <FormLabel className='m-0'>Slugify value</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-readonly
                      className='m-0 h-7 w-12'
                      thumbClassName='h-6 w-6'
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setAddCustomLinkTypeOpen(false)}
            >
              Close
            </Button>
            <Button variant='default' type='submit'>
              Add
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </Modal>
  )
}
